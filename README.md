# AskAura

AskAura is a static web app for tarot-inspired and Meihua-style reflective readings. It is migrated from the old RiLL / cijing project, but this repository must deploy to AskAura-owned infrastructure only.

## Current Status

- Frontend: static `index.html`, `styles.css`, and native JS modules.
- Admin: `admin.html`.
- Backend: Supabase Edge Functions under `supabase/functions`.
- Supabase URL: `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Runtime provider: DeepSeek, verified through function smoke.
- Active data names: `askaura_reflection_records`, `askaura_daily_anchors`, `askaura_runtime_config`.
- Old cijing Supabase ref `icvegpfnpkyrebtojoca` is a legacy reference, not a deployment target.

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
