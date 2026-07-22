# AskAura

AskAura（象问）是一款 AI 反思产品：卡牌负责提供观察隐喻，卦象负责补充结构视角，系统最终帮助用户确认一个可验证的洞见和一个可执行的小行动。它不预测未来，也不替用户下结论。

本项目由旧 RiLL / cijing 项目独立迁移而来，只能部署到 AskAura 自有基础设施。

## Current Status

- Frontend: static `index.html`, `styles.css`, `theme-observation.css`, and native JS modules under `assets/app/`.
- Admin: `admin.html`.
- Backend: Supabase Edge Functions under `supabase/functions`.
- Supabase URL: `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Runtime provider: DeepSeek, verified through function smoke.
- Active data names: `askaura_reflection_records`, `askaura_daily_anchors`, `askaura_runtime_config`.
- Old cijing Supabase ref `icvegpfnpkyrebtojoca` is a legacy reference, not a deployment target.

## Project Map

- `index.html`: public product shell; keep behavior in modules rather than adding large inline scripts.
- `assets/app/`: product logic, views, storage, sync, reading and share modules.
- `assets/cards/reflection-v1/`: current reflection artwork and category fallbacks.
- `assets/styles/`: reflection deck and result/share presentation layers.
- `admin.html` / `admin.css`: operations console.
- `supabase/`: migrations and Edge Functions.
- `tests/`: local contracts and regression checks.
- `legacy/`: read-only rollback snapshot; do not extend it with new product work.
- `docs/ask-aura-implementation-plans/00-index.md`: implementation status source of truth.
- `docs/design/reflection-deck-v1/`: current card-art direction and Image 2 prompts.

## Local Development

Serve the repo explicitly so you do not accidentally open another project on the same port:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

Open:

```text
http://127.0.0.1:5174/index.html
```

## Tests

项目运行时固定为 Node.js 24。可使用 Codex 本机运行时执行完整测试基线：

```powershell
$node = "C:\Users\17751\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
Get-ChildItem tests -Filter "*.test.mjs" | Sort-Object Name | ForEach-Object {
  if ($_.Name -eq "index-syntax.test.mjs") {
    & $node --experimental-vm-modules $_.FullName
  } else {
    & $node $_.FullName
  }
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" }
}
```

也可按文件逐项执行：

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/phase1-mobile-css.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

## Authenticated Release Smoke

Smoke credentials must be provided only through the local shell environment. Do not write them into code, docs, git, or chat.

Required env vars:

- `ASKAURA_SMOKE_SUPABASE_URL`
- `ASKAURA_SMOKE_ANON_KEY`
- `ASKAURA_SMOKE_USER_EMAIL`
- `ASKAURA_SMOKE_USER_PASSWORD`
- `ASKAURA_SMOKE_ADMIN_USERNAME`
- `ASKAURA_SMOKE_ADMIN_PASSWORD`

Run:

```powershell
node tests/release-smoke-authenticated.mjs
```

This verifies admin login and config read, signed-in record write/read/delete, share-link create/revoke, and resonance submit/revoke against AskAura Supabase.

## Supabase Deployment Boundary

AskAura now uses a dedicated Supabase project. Keep frontend/admin configuration pointed at:

```text
https://oeqekrlodqxjlakdjqpu.supabase.co
the AskAura anon publishable key
```

Deploy only to the AskAura project:

```powershell
supabase db push --project-ref <ASKAURA_PROJECT_REF>
supabase functions deploy reading --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy tarot-draw --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy admin-config --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy share-link --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy resonance-pool --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
```

Never deploy AskAura changes to `icvegpfnpkyrebtojoca`.

## Vercel Status

- Latest protected preview verified: `https://askaura-jukfa6xm8-jamison-zhous-projects.vercel.app`.
- Production URL verified: `https://askaura.vercel.app`.
