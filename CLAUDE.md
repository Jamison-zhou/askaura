# AskAura Project Rules

> This file is loaded at the start of Claude Code sessions for `D:\CursorAgentChats\askaura`.

## Project Boundary

- AskAura is an independent project migrated from RiLL / cijing.
- Do not deploy AskAura code, migrations, functions, or secrets to the old cijing Supabase project.
- Old cijing Supabase ref: `icvegpfnpkyrebtojoca`. Treat it as a legacy reference only.
- Active code uses AskAura names: `ASKAURA_SUPABASE_URL`, `ASKAURA_SUPABASE_ANON_KEY`, `askaura_reflection_records`, `askaura_daily_anchors`, `askaura_runtime_config`.
- Legacy localStorage keys may be read for compatibility: `rill.history.v1`, `rill.dailyAnchors.v1`. New writes must use `askaura.*` keys.

## Current Stack

- Frontend: static `index.html`, `styles.css`, and native JS modules. No Vite, Next, or build-time env injection.
- Admin: `admin.html`.
- Storage: `assets/app/storage.js`.
- Sync: `assets/app/sync.js`.
- Supabase Edge Functions: `reading`, `tarot-draw`, `admin-config`.
- `tarot-draw` logs draw events and returns `{ ok: true }`; it does not draw cards server-side.
- `reading` is SSE and keeps the current frontend contract.

## Supabase Rules

- Use the dedicated AskAura Supabase project for real deployment.
- Do not write service role keys, provider keys, admin passwords, or admin session secrets into code, git, markdown, or chat.
- Required function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER`, provider API keys/models, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`.
- Deploy functions with `--no-verify-jwt` unless auth behavior is redesigned first.

## Local Verification

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/phase1-mobile-css.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

Open `http://127.0.0.1:5174/index.html`.

## Product And Content Rules

- AskAura is not a fortune-telling tool and must not present deterministic predictions.
- Avoid terms such as `算命`, `玄学`, `转运`, `灵签`, `改运`, and `命中注定`.
- Do not use `亲爱的`, `宝贝`, or emoji in generated guidance.
- Every reading should end with one concrete action the user can take today or this week.
- Keep visual and copy changes restrained. Do not add unrelated product features during migration.
