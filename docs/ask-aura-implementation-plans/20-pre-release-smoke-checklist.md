# AskAura Pre-Release Smoke Checklist

> **For agentic workers:** This is a verification checklist, not a feature plan. Do not add features while running this checklist. Record failures as bugs or follow-up plans instead of fixing unrelated scope opportunistically.

**Goal:** Provide one compact release-readiness checklist for AskAura after the migration, Phase 1.5, Phase 8A, Phase 9A, and refactor route are complete.

**Scope:** Static frontend, admin page, Supabase Edge Functions, Supabase tables/RLS assumptions, model routing, privacy boundaries, and rollback controls.

---

## Release Gate

Start a release smoke only when these are true:

- [ ] `docs/ask-aura-implementation-plans/00-index.md` still marks Phase 8B live payment as blocked.
- [ ] No checkout button, payment purchase copy, customer portal, or provider-specific webhook is being released.
- [ ] The target environment is clear: local, preview, or production.
- [ ] The target Supabase project is the AskAura project, not the legacy cijing project.
- [ ] Required secrets are configured outside git and markdown.
- [ ] Rollback owner and rollback path are known.

## Static And Contract Tests

Run the relevant subset for small changes. For broad release validation, run all `.mjs` tests:

```powershell
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true } }; if ($failed) { exit 1 }
```

Minimum baseline for document-free code changes:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/phase1-mobile-css.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

Expected:

- [ ] Tests pass.
- [ ] No active code points to old Supabase ref `icvegpfnpkyrebtojoca`.
- [ ] New writes use AskAura table names and `askaura.*` localStorage keys.
- [ ] Legacy localStorage read compatibility still works where intended.
- [ ] Forbidden deterministic or fortune-changing copy is not introduced.

## Local Browser Smoke

Start a local static server:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

Open:

```text
http://127.0.0.1:5174/index.html
```

Check desktop and mobile widths, including 390px:

- [ ] Page loads without a blank screen.
- [ ] Main reading mode can be selected.
- [ ] Tarot flow reaches a visible result.
- [ ] Meihua flow reaches a visible result.
- [ ] Dual flow reaches a visible result.
- [ ] Daily mode renders without layout breakage.
- [ ] Result includes one concrete action.
- [ ] Follow-up panel opens where supported.
- [ ] Custom follow-up handles empty or failed states gracefully.
- [ ] History opens and saved records render.
- [ ] Share image button does not break the page.
- [ ] Private link controls remain hidden or gated when signed out.
- [ ] Resonance controls remain gated when signed out.
- [ ] Companion panel opens and handles empty history.
- [ ] No checkout button or live purchase UI appears.
- [ ] Text does not overflow buttons, cards, or compact panels.

## HTTP Smoke

Use the deployed AskAura function URLs for preview or production. Do not call the old cijing project.

Reading function:

- [ ] `reading` returns `200` for a valid basic request.
- [ ] SSE stream emits readable text.
- [ ] Response headers include `X-AskAura-Provider`, `X-AskAura-Model`, `X-AskAura-Tier`, `X-AskAura-Entry`, and `X-AskAura-Thinking`.
- [ ] Anonymous request receives `X-AskAura-Tier: basic`.
- [ ] Browser-sent `tier: "pro"` does not unlock pro for a free or anonymous user.
- [ ] Timeout, provider failure, or malformed request returns a readable error.

Admin config function:

- [ ] Public config can be read without exposing secrets.
- [ ] Admin login works with configured credentials.
- [ ] Save requires an admin session.
- [ ] Ops quality logging and scanner toggles persist.
- [ ] Paid UI and pro model kill switches persist.

Auxiliary functions:

- [ ] `tarot-draw` accepts valid draw event logging and does not draw cards server-side.
- [ ] `share-link` rejects anonymous create, accepts authenticated create, supports read, and respects revoke.
- [ ] `resonance-pool` rejects anonymous submit, allows list/read of public redacted items, and does not expose private text.
- [ ] `billing-webhook` rejects forged or unsigned calls. Do not test provider-specific payment behavior while Phase 8B is blocked.

## Supabase Data And Privacy Smoke

Check with safe queries or dashboard views only. Do not paste secrets into notes.

- [ ] `askaura_reflection_records` writes only for the current user.
- [ ] `askaura_daily_anchors` writes only for the current user.
- [ ] `askaura_runtime_config` is the active runtime config table.
- [ ] `askaura_entitlements`, `askaura_usage_events`, and `askaura_billing_events` deny direct client writes.
- [ ] `askaura_quality_events` stores metadata only.
- [ ] Quality events do not contain raw question, full generated answer, or follow-up text.
- [ ] Usage events do not contain raw question, full generated answer, or follow-up text.
- [ ] Share-link public payload is cropped/redacted as designed.
- [ ] Resonance public payload is cropped/redacted as designed.

## Admin Browser Smoke

Open `admin.html` in the same target environment:

- [ ] Admin page loads without layout overflow at desktop width.
- [ ] Admin page loads without layout overflow at 390px width.
- [ ] Login form works.
- [ ] Public runtime config displays expected model settings.
- [ ] Ops section exposes quality logging and content scanner toggles.
- [ ] Paid section shows disabled-state controls only; no live checkout configuration is exposed as a release action.
- [ ] Saving config does not erase unrelated config sections.
- [ ] Exported config filename and visible copy use AskAura naming.

## Content And Product Smoke

- [ ] Product copy uses AskAura / 象问 naming where visible.
- [ ] No visible cijing or RiLL brand remains except legacy compatibility notes.
- [ ] Guidance does not present deterministic predictions.
- [ ] Guidance does not use forbidden promise language such as fortune changing, guaranteed reunion, wealth/luck packages, or certainty claims.
- [ ] Generated guidance avoids overfamiliar address and emoji.
- [ ] Every result ends with an action the user can take today or this week.
- [ ] Free core remains useful without paid access.

## Rollback Smoke

Before release, confirm the rollback path:

- [ ] Runtime config can disable quality logging.
- [ ] Runtime config can disable content safety scanning.
- [ ] Runtime config can disable paid UI.
- [ ] Runtime config can disable pro model routing.
- [ ] Previous frontend deployment URL or artifact is known.
- [ ] Supabase function redeploy command is known for `reading` and `admin-config`.
- [ ] No rollback step deletes entitlement, billing, usage, quality, reflection, or anchor history.

Recommended emergency runtime config shape:

```json
{
  "paid": {
    "enabled": false,
    "proModelEnabled": false
  },
  "ops": {
    "qualityLoggingEnabled": false,
    "contentSafetyScanEnabled": false
  },
  "models": {
    "pro": {
      "enabled": false,
      "thinking": false
    }
  }
}
```

## Release Notes Template

Use this short template after a smoke run:

```text
Target:
Date:
Build/deploy URL:
Supabase project ref:
Tests run:
Browser smoke:
HTTP smoke:
Admin smoke:
Privacy checks:
Known issues:
Rollback path confirmed: yes/no
Payment Phase 8B remained blocked: yes/no
Go/no-go:
```

## Go / No-Go Rule

Release is a no-go if any of these are true:

- A request writes to the old cijing Supabase project.
- Reading flow is blank or cannot produce a result.
- Admin config exposes secrets or cannot save rollback flags.
- Browser can unlock pro by sending a client-side tier.
- Quality, usage, share, or resonance data stores raw private text where the design says it must not.
- Payment UI or provider-specific payment behavior appears while Phase 8B is still blocked.
- Mobile layout blocks the primary reading flow.
