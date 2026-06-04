# AskAura Handoff - Phase 0 / Phase 1 Status - 2026-06-03

## Current State

AskAura is pointed at the dedicated AskAura Supabase project in active frontend/admin code:

- Supabase URL: `https://oeqekrlodqxjlakdjqpu.supabase.co`
- Runtime provider verified by smoke: `deepseek`
- Runtime model verified by smoke: `deepseek-v4-flash`

Phase 1.5 model routing is intentionally not implemented in this pass.

## Completed

- Active frontend config uses `ASKAURA_SUPABASE_URL` and `ASKAURA_SUPABASE_ANON_KEY`.
- Active sync uses `askaura_reflection_records` and `askaura_daily_anchors`.
- Runtime config uses `askaura_runtime_config`.
- Old `rill_*` migrations were removed from the active migration path.
- DeepSeek provider exists and is wired through the existing provider factory.
- User-facing docs and project rules warn against deploying to the old cijing project.
- Result empty sections are hidden.
- A failed reading no longer clears the previous completed result context before success.
- Mobile CSS guardrails were added for result layout, ritual deck/actions, and follow-up controls.

## Verification Evidence

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

HTTP smoke passed:

- Local page returns HTTP 200.
- Local page includes AskAura Supabase config.
- Local page does not include old cijing Supabase ref.
- Local page includes DeepSeek config.

Local browser smoke passed through browser-harness:

- `http://127.0.0.1:5174/index.html` opened with browser title `象问 AskAura`.
- Browser global `window.ASKAURA_SUPABASE_URL` is `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Browser DOM check found no old `icvegpfnpkyrebtojoca` ref and no old `RILL_SUPABASE_URL`.
- `http://127.0.0.1:5174/admin.html` opened with browser title `AskAura Admin`.
- Admin browser DOM check found no old ref/global.
- 390px mobile viewport had `scrollWidth=390`, `clientWidth=390`, and `hasHorizontalOverflow=False`.

Function smoke passed:

- `tarot-draw` returned HTTP 200 and `{ "ok": true }` with request body shape `{ card, orientation, intent, question }`.
- `admin-config public` returned HTTP 200, `provider=deepseek`, `model=deepseek-v4-flash`, and no `apiKey`.
- `reading anchor` returned HTTP 200, SSE `[DONE]`, `X-AskAura-Provider=deepseek`, `X-AskAura-Model=deepseek-v4-flash`, and no old `X-Rill-*` header.

Preview smoke passed through Vercel access link:

- Latest protected preview: `https://askaura-jukfa6xm8-jamison-zhous-projects.vercel.app`.
- Preview `index.html` returned HTTP 200 and contained `象问 AskAura` plus the AskAura Supabase URL.
- Preview `admin.html` returned HTTP 200 and contained `AskAura Admin`, DeepSeek provider options, and the AskAura Supabase URL.

Production smoke passed:

- Production URL: `https://askaura.vercel.app`.
- Production deployment ID: `dpl_3jE5ddH51BP8kVVdt56zyUSDMkYk`.
- Production `index.html` returned HTTP 200 and contained `象问 AskAura` plus the AskAura Supabase URL.
- Production `admin.html` returned HTTP 200 and contained `AskAura Admin`, DeepSeek model, and the AskAura Supabase URL.
- Production HTTP check found no old `icvegpfnpkyrebtojoca` ref and no old `RILL_SUPABASE_URL`.
- Production browser smoke opened `https://askaura.vercel.app/index.html` with title `象问 AskAura`.
- Production browser global `window.ASKAURA_SUPABASE_URL` is `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Production 390px mobile viewport had `scrollWidth=390`, `clientWidth=390`, and `hasHorizontalOverflow=False`.

## Browser Verification Note

Codex bundled Node/Playwright automation currently fails before launch:

```text
Cannot find package 'playwright-core' imported from ...\node_modules\playwright\index.mjs
```

Per user instruction, this pass used the working browser-harness path for local browser smoke and interface + HTTP smoke for protected preview validation. The old Node/Playwright path still needs a repaired dependency if that exact toolchain is required later.

## Remaining Work

- Optional manual mobile visual pass at 375px and 430px if stricter screenshot coverage is required.
- Continue Phase 2 only after public beta smoke is accepted.
