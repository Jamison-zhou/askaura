# AskAura Pre-Release Smoke Report - 2026-06-04

**Target:** Local static site plus deployed AskAura Supabase Edge Functions.

**Local URL:** `http://127.0.0.1:5174/index.html`

**Supabase project ref:** `oeqekrlodqxjlakdjqpu`

**Worktree state:** Dirty working tree with many AskAura migration/refactor changes. This smoke validates the current local working tree, not a clean commit.

**Payment Phase 8B:** Still blocked. No checkout, customer portal, payment purchase copy, or provider-specific payment behavior was intentionally tested or implemented.

---

## Summary

**Decision:** Prepare for preview validation, but do not call this a production go yet.

No P0 release blockers were found in this smoke:

- Full local `.mjs` test suite passed.
- Local AskAura page loads in Chrome headless at desktop and 390px mobile widths.
- Mobile layout has no document-level horizontal overflow in CDP measurement.
- Active frontend points to the AskAura Supabase project, not the old cijing ref.
- Deployed `reading` returns SSE `200`.
- Browser-sent `tier: "pro"` is ignored for an anonymous/free request; response stays `X-AskAura-Tier: basic`.
- `billing-webhook` rejects unsigned forged input with `400 Invalid signature`.
- No live payment checkout UI was visible in local browser smoke.

Remaining release caveats:

- Authenticated Admin save was not tested because admin credentials are secrets and were not used in this smoke.
- Authenticated share-link create/revoke and user-owned RLS data checks were not tested because no signed-in user session was used.
- The browser automation toolchain lacked a working Playwright install, so browser smoke used Chrome headless screenshots, DOM dump, and CDP layout measurement instead of full click-through automation.

## Commands And Evidence

### Static And Contract Tests

Command:

```powershell
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { Write-Host "RUN $($_.Name)"; node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true; Write-Host "FAIL $($_.Name) exit=$LASTEXITCODE" } else { Write-Host "PASS $($_.Name)" } }; if ($failed) { exit 1 }
```

Result:

- Exit code: `0`
- Passed test files: `23`
- Notable coverage: migration static checks, storage/sync, follow-up, model router, mobile CSS, sharing/export, resonance pool, companion, paid entitlements, ops quality, and refactor slices.

### Local Browser Smoke

Chrome headless generated DOM and screenshots under:

```text
D:\CursorAgentChats\askaura\docs\smoke-reports\artifacts-2026-06-04
```

Artifacts:

- `index-desktop.wait.png`
- `index-mobile390.wait.png`
- `admin-desktop.png`
- matching `.dom.html` and `.stderr.txt` files

Observed:

- Desktop page rendered AskAura / 象问 shell and main reading form.
- Mobile 390px page rendered navigation, headline, and reading form.
- Admin page rendered login form.
- Chrome stderr only showed browser/runtime warnings such as GCM registration messages and PNG warnings; no app-specific stack trace was captured by this path.

CDP mobile layout measurement at 390px:

```json
{
  "title": "象问 AskAura",
  "bodyChars": 325,
  "widths": {
    "innerWidth": 390,
    "docClientWidth": 390,
    "docScrollWidth": 390,
    "bodyScrollWidth": 390
  },
  "flags": {
    "cijing": false,
    "rill": false,
    "payment": false
  },
  "overflow": []
}
```

Result:

- Page title contains AskAura.
- No old cijing/RiLL visible in measured text.
- No live payment phrase detected in measured text.
- No document-level horizontal overflow.
- Key selectors exist: `#question-input`, `#question-form`, `#history-btn`, `#companion-btn`, `#share-image-btn`, `#resonance-open-btn`.

### Active Code Static Boundary Check

Active code scan:

```powershell
rg -n 'icvegpfnpkyrebtojoca|RILL_SUPABASE|rill_reflection_records|rill_daily_anchors|rill_runtime_config|支付宝|立即购买|开通会员|customer portal' index.html admin.html assets supabase --glob '!legacy/**'
```

Result:

- No active-code match for old Supabase ref or old RILL Supabase constants.
- No active-code live payment entry such as Alipay, buy-now, or member-open copy.
- `admin.html` contains the expected guardrail note that paid features stay disabled until checkout and refund handling are selected.

Note:

- `legacy/index.v1.html` still contains old cijing/RiLL references. This was not counted as active code.
- Tests contain old-name strings as negative assertions. This is expected.

### HTTP Smoke

Base:

```text
https://oeqekrlodqxjlakdjqpu.supabase.co/functions/v1
```

Admin public config:

- Endpoint: `admin-config`
- Request: `{ "action": "public" }`
- Status: `200`
- Project header: `oeqekrlodqxjlakdjqpu`
- Response shows `llm.provider: deepseek`, basic model enabled, pro model disabled.

Reading SSE:

- Endpoint: `reading`
- Request: `mode: "anchor"`, `tier: "pro"` injected from client.
- Status: `200`
- Content-Type: `text/event-stream`
- Headers:
  - `X-AskAura-Provider: deepseek`
  - `X-AskAura-Model: deepseek-v4-flash`
  - `X-AskAura-Tier: basic`
  - `X-AskAura-Entry: daily`
  - `X-AskAura-Thinking: disabled`
- Result: client-forced pro tier did not unlock pro.

Billing webhook forged request:

- Endpoint: `billing-webhook`
- Request: unsigned fake `subscription.active`
- Status: `400`
- Body: `{ "error": "Invalid signature" }`

Auxiliary functions:

- `tarot-draw`: valid draw event returned `200 { "ok": true }`.
- `share-link`: fake token read returned `404 { "error": "Share link not found" }`.
- `resonance-pool`: anonymous submit returned `401 { "error": "Unauthorized" }`.
- `resonance-pool`: public list returned `200 { "items": [] }`.

## Checklist Result

| Area | Result | Notes |
| --- | --- | --- |
| Static tests | Pass | 23 `.mjs` files passed. |
| Local desktop render | Pass | Chrome headless screenshot generated. |
| Local mobile render | Pass | 390px screenshot and CDP layout measurement generated. |
| Old Supabase guard | Pass | Active code scan excludes old ref; legacy folder still has old snapshot. |
| Payment blocked guard | Pass | No live checkout UI detected; webhook rejects unsigned input. |
| Reading HTTP smoke | Pass | SSE 200; forced pro tier remains basic. |
| Admin public config | Pass | Public config read returns 200 without secrets. |
| Admin authenticated save | Not tested | Requires admin secret credentials. |
| Authenticated share/revoke | Not tested | Requires signed-in user session. |
| Direct RLS data smoke | Not tested | Covered by static contract tests only in this run. |

## Known Issues / Follow-Ups

1. **Preview-ready, not production-go:** Run one manual authenticated pass before production: admin login/save, signed-in reading history sync, share-link create/revoke, and one authenticated resonance submit/revoke.
2. **Browser automation dependency:** Playwright import failed because bundled `playwright` could not resolve `playwright-core`. Chrome headless/CDP was used as the fallback.
3. **Dirty worktree:** The current tree has many uncommitted migration/refactor changes. Stabilize or commit intentionally before production release.

## Go / No-Go

**Go for preview validation:** Yes.

**Go for production:** Not yet.

Production should wait for the remaining authenticated smoke items and a clear release artifact or commit boundary.

## Authenticated Smoke Addendum

Status: Pending.

Pending because live smoke secrets are unavailable in this workspace.

Run `node tests/release-smoke-authenticated.mjs` with smoke credentials from the local shell before production promotion.

## Final Go / No-Go Addendum

Decision: No-Go for production until authenticated smoke credentials are available and the live authenticated smoke passes.

- Full local `.mjs` suite: Pass
- Local static HTTP smoke: Pass
- Authenticated admin smoke: Pending
- Authenticated user data smoke: Pending
- Share/resonance authenticated smoke: Pending
- Old cijing active-code scan: Pass, with only the guarded rejection sentinel in `assets/app/config.js`
- Payment checkout remains disabled unless Phase 8B is separately completed: Pass

Failed command:

```powershell
node tests/release-smoke-authenticated.mjs
```

Response:

```text
Missing required smoke env: ASKAURA_SMOKE_SUPABASE_URL
```
