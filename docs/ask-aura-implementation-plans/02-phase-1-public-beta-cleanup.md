# Phase 1: Public Beta Cleanup Implementation Plan

> **For agentic workers:** Use Superpowers executing-plans or subagent-driven-development. Keep Phase 1 focused on public beta cleanup. Do not implement Phase 1.5 model routing here.

## Goal

Make AskAura stable enough for public beta after Supabase isolation.

## Preconditions

- [x] Phase 0 active code no longer points to the old cijing Supabase project.
- [x] AskAura Supabase URL is present in `index.html`, `admin.html`, and `_headers`.
- [x] DeepSeek runtime is configured and verified by function smoke.
- [x] Existing local tests pass.

## Task 1: Brand Cleanup

**Files:** `index.html`, `admin.html`, `README.md`, `DEPLOY.md`, `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `CLAUDE.md`

- [x] Replace user-visible legacy brand references with AskAura / Xiangwen where appropriate.
- [x] Preserve legacy references only in clearly marked migration or warning contexts.
- [x] Ensure page title is AskAura / Xiangwen.
- [x] Ensure admin title is AskAura Admin.
- [x] Ensure deployment docs reference AskAura Supabase and Vercel only.

## Task 2: Result Empty-State Hardening

**Files:** `index.html`, `tests/clarify-contract.test.mjs`

- [x] Audit result render paths for empty strings.
- [x] Hide any section whose body text is empty.
- [x] Keep current accepted result page structure.
- [x] Add/keep test coverage that rejects `undefined`, `null`, and empty result sections.

## Task 3: Mobile Smoke Cleanup

**Files:** `styles.css`, `tests/phase1-mobile-css.test.mjs`

- [x] Add guardrails for 375px, 390px, and 430px mobile widths by static CSS review.
- [x] Keep ritual modal title/actions less likely to be covered by selected cards.
- [x] Keep result page stacked without horizontal overflow.
- [x] Make follow-up panel input and buttons fit by using one-column mobile controls.
- [x] Preserve history and login panel viewport constraints.
- [x] Add static CSS tests for the mobile guardrails.

## Task 4: Error And Retry Text

**Files:** `index.html`, `tests/clarify-contract.test.mjs`

- [x] Ensure reading failure keeps the original question.
- [x] Ensure reading failure does not clear the previous completed result context before success.
- [x] Ensure copy avoids blame and mystical wording.
- [x] Keep one visible recovery path through existing retry/new-reading controls.

## Task 5: Documentation Cleanup

**Files:** `README.md`, `DEPLOY.md`, `AGENTS.md`, `CLAUDE.md`, `docs/ask-aura-handoff-2026-06-03-phase0-phase1.md`

- [x] Document local static server command.
- [x] Document test commands.
- [x] Document production Vercel URL.
- [x] Document that old cijing Supabase is not a deployment target.
- [x] Document current backend contracts for `reading`, `tarot-draw`, and `admin-config`.
- [x] Document local browser smoke, preview HTTP smoke, and remaining production URL gap.

## Verification

- [x] Run all existing tests.
- [x] Run old-ref scan.
- [x] Confirm remaining hits are explicit legacy warnings, plan text, or negative test assertions.
- [x] Attempt Codex browser smoke on local.
- [x] Run local browser smoke through browser-harness.
- [x] Run local mobile browser smoke at 390px.
- [x] Run protected preview HTTP smoke through Vercel access link.
- [x] Production smoke.

## Current Verification Evidence

Local tests passed:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/phase1-mobile-css.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

Function smoke passed:

- `tarot-draw`: HTTP 200, `{ "ok": true }` with request body shape `{ card, orientation, intent, question }`.
- `admin-config public`: HTTP 200, `provider=deepseek`, `model=deepseek-v4-flash`, no `apiKey`.
- `reading anchor`: HTTP 200, SSE `[DONE]`, `X-AskAura-Provider=deepseek`, `X-AskAura-Model=deepseek-v4-flash`, no old `X-Rill-*` header.

Local browser smoke passed:

- `http://127.0.0.1:5174/index.html`: browser title `象问 AskAura`.
- Browser global `window.ASKAURA_SUPABASE_URL` is `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Browser DOM check: old `icvegpfnpkyrebtojoca` ref is absent.
- Browser DOM check: old `RILL_SUPABASE_URL` global is absent.
- `http://127.0.0.1:5174/admin.html`: browser title `AskAura Admin`, old ref/global absent.
- 390px mobile viewport: `scrollWidth=390`, `clientWidth=390`, `hasHorizontalOverflow=False`.

Preview HTTP smoke passed:

- Latest protected preview: `https://askaura-jukfa6xm8-jamison-zhous-projects.vercel.app`.
- Vercel access-link fetch returned HTTP 200 for `index.html`.
- Preview HTML contains `象问 AskAura` and `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Vercel access-link fetch returned HTTP 200 for `admin.html`.
- Preview admin HTML contains `AskAura Admin`, DeepSeek provider options, and AskAura Supabase URL.

Production smoke passed:

- Production URL: `https://askaura.vercel.app`.
- Production deployment ID: `dpl_3jE5ddH51BP8kVVdt56zyUSDMkYk`.
- Production `index.html`: HTTP 200, contains `象问 AskAura` and AskAura Supabase URL.
- Production `admin.html`: HTTP 200, contains `AskAura Admin`, DeepSeek model, and AskAura Supabase URL.
- Production HTTP check found no old `icvegpfnpkyrebtojoca` ref and no old `RILL_SUPABASE_URL`.
- Production browser smoke title: `象问 AskAura`.
- Production browser global `window.ASKAURA_SUPABASE_URL` is `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Production 390px mobile viewport: `scrollWidth=390`, `clientWidth=390`, `hasHorizontalOverflow=False`.

Known browser tooling note:

- The old Node/Playwright path still fails with missing `playwright-core`.
- browser-harness works and is the current local browser smoke path.

## Definition Of Done

- [x] User-visible brand is AskAura / Xiangwen.
- [x] Docs no longer guide deployment to cijing.
- [x] Mobile core flows have static guardrails and tests.
- [x] Result page has no empty/undefined/null sections.
- [x] Local public beta smoke passes by HTTP + interface fallback.
- [x] Local browser smoke passes through browser-harness.
- [x] Protected preview HTTP smoke passes through Vercel access link.
- [x] Production URL and production smoke are complete.
