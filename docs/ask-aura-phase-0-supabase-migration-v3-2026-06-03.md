# AskAura Phase 0 Supabase Migration Plan v3 - 2026-06-03

## 1. Purpose

Move AskAura from the old cijing/RiLL Supabase project to a dedicated AskAura Supabase project with minimum behavior change.

This is a Phase 0 migration plan, not a feature plan. The goal is backend isolation, not product expansion.

## 2. Current Repo Facts

This plan is based on the real repository at:

```text
D:\CursorAgentChats\askaura
```

Current facts:

- Frontend is pure static HTML/CSS/JS. There is no Vite, Next.js, or build-time env injection.
- Main frontend file: `index.html`.
- Admin frontend: `admin.html`.
- Local storage module: `assets/app/storage.js`.
- Cloud sync module: `assets/app/sync.js`.
- Meihua logic: `assets/app/meihua.js`.
- Edge Functions:
  - `supabase/functions/reading/index.ts`
  - `supabase/functions/tarot-draw/index.ts`
  - `supabase/functions/admin-config/index.ts`
- Runtime config helper:
  - `supabase/functions/_shared/runtime-config.ts`
- Current old Supabase project ref:

```text
icvegpfnpkyrebtojoca
```

- Current old Supabase URL:

```text
https://icvegpfnpkyrebtojoca.supabase.co
```

- Current runtime table names:
  - `rill_reflection_records`
  - `rill_daily_anchors`
  - `rill_runtime_config`
- Current localStorage keys:
  - `rill.history.v1`
  - `rill.dailyAnchors.v1`
  - `rill.authSession.v1`
- Current frontend globals:
  - `window.RILL_SUPABASE_URL`
  - `window.RILL_SUPABASE_ANON_KEY`

## 3. Non-Goals

Do not include these in Phase 0:

- AI ordinary follow-up.
- Clarification-card report rewrite.
- Multi-card spreads.
- Meihua cast enhancement.
- Share image.
- Private links.
- Community.
- Paid features.
- A/B testing.
- Prompt CMS.
- Large `index.html` refactor.
- Switching record primary keys from text to uuid unless storage, sync, history restore, migrations, and tests are all updated in the same scoped task.

## 4. Migration Strategy

Use a minimum equivalent migration.

That means:

- Keep the current app behavior.
- Keep current record shape as much as possible.
- Rename backend resources from `rill_*` to `askaura_*`.
- Move secrets and functions to a new AskAura Supabase project.
- Keep local fallback compatibility with old localStorage data.
- Do not migrate old cijing cloud data by default.
- Do not modify the old cijing Supabase project except read-only checks.

## 5. Required Decisions Before Execution

These are the only decisions needed before implementation:

1. New Supabase project ref: `<ASKAURA_PROJECT_REF>`.
2. New Supabase URL: `https://<ASKAURA_PROJECT_REF>.supabase.co`.
3. New Supabase anon publishable key.
4. New provider secrets:
   - `AI_PROVIDER`
   - `XIAOMI_API_KEY` or `KIMI_API_KEY`
   - provider model/base URL secrets currently used by code
5. New admin secrets:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - `ADMIN_SESSION_SECRET`

Never write secret values into repo files, docs, issues, commits, or chat.

## 6. Current Backend Contracts

### 6.1 `reading`

Current accepted `mode` values:

```text
reading
advice
anchor
meihua-reading
clarify
```

Current language values:

```text
zh
en
```

Smoke request shape for tarot reading:

```json
{
  "mode": "reading",
  "cardName": "The Fool",
  "orientation": "upright",
  "intent": "clarity",
  "question": "我今天应该观察什么？",
  "round": 1,
  "sessionHistory": "",
  "language": "zh"
}
```

Do not use `mode: "tarot"` or `language: "zh-CN"` unless the backend contract is intentionally changed.

### 6.2 `tarot-draw`

Current function behavior:

- It is a fire-and-forget draw event endpoint.
- It validates and logs an event.
- It returns `{ "ok": true }`.
- It does not draw or return a card.

Current request shape:

```json
{
  "card": "The Fool",
  "orientation": "upright",
  "intent": "clarity",
  "question": "我今天应该观察什么？"
}
```

Do not use `tarot-draw` as a server-side card draw endpoint in Phase 0.

### 6.3 `admin-config`

Current actions:

- `public`
- `login`
- `get`
- `save`

Current admin secrets used by code:

```text
ADMIN_USERNAME
ADMIN_PASSWORD_HASH
ADMIN_SESSION_SECRET
```

Do not configure `ADMIN_CONFIG_SECRET` or `ALLOWED_ADMIN_EMAILS` unless the function code is intentionally changed first.

## 7. Database Plan

### 7.1 Recommended Phase 0 Tables

Create AskAura equivalents of the current tables:

- `askaura_reflection_records`
- `askaura_daily_anchors`
- `askaura_runtime_config`

Keep the schema close to current implementation.

### 7.2 `askaura_reflection_records`

Use text IDs to match current frontend records.

Recommended schema:

```sql
create table if not exists public.askaura_reflection_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  mode text not null check (mode in ('tarot', 'meihua', 'dual', 'daily')),
  title text not null default '',
  question text not null default '',
  answer text not null default '',
  action text not null default '',
  image_src text not null default '',
  image_alt text not null default '',
  anchor jsonb,
  language text not null default 'zh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists askaura_reflection_records_user_created_idx
  on public.askaura_reflection_records (user_id, created_at desc);

alter table public.askaura_reflection_records enable row level security;
```

RLS:

```sql
create policy "Users can read own AskAura reflection records"
  on public.askaura_reflection_records
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own AskAura reflection records"
  on public.askaura_reflection_records
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own AskAura reflection records"
  on public.askaura_reflection_records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own AskAura reflection records"
  on public.askaura_reflection_records
  for delete
  using (auth.uid() = user_id);
```

### 7.3 `askaura_daily_anchors`

Keep current daily anchor behavior close to existing code.

Recommended schema:

```sql
create table if not exists public.askaura_daily_anchors (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date_key date not null,
  record_id text not null,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key)
);

alter table public.askaura_daily_anchors enable row level security;
```

RLS:

```sql
create policy "Users can read own AskAura daily anchors"
  on public.askaura_daily_anchors
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own AskAura daily anchors"
  on public.askaura_daily_anchors
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own AskAura daily anchors"
  on public.askaura_daily_anchors
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own AskAura daily anchors"
  on public.askaura_daily_anchors
  for delete
  using (auth.uid() = user_id);
```

### 7.4 `askaura_runtime_config`

Keep the current runtime config shape:

- `id text primary key`
- `config jsonb`
- `updated_at`

Recommended schema:

```sql
create table if not exists public.askaura_runtime_config (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.askaura_runtime_config enable row level security;

create policy "askaura_runtime_config_no_public_access"
  on public.askaura_runtime_config
  for all
  using (false)
  with check (false);

insert into public.askaura_runtime_config (id, config)
values (
  'default',
  '{
    "llm": {
      "provider": "xiaomi",
      "model": "mimo-v2.5-pro",
      "baseUrl": "https://token-plan-cn.xiaomimimo.com/v1",
      "apiKey": "",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "translations": {}
  }'::jsonb
)
on conflict (id) do nothing;
```

Do not add public read RLS to this table in Phase 0. The frontend should continue reading public runtime config through the `admin-config` Edge Function, which returns a masked config.

## 8. Code Changes

### 8.1 `index.html`

Current behavior:

- Supabase URL and anon key are hardcoded in a script block.
- `API_URL` and `CONFIG_API_URL` are derived from `window.RILL_SUPABASE_URL`.
- `createSyncClient` receives `window.RILL_SUPABASE_URL` and `window.RILL_SUPABASE_ANON_KEY`.

Required Phase 0 change:

- Rename globals to:
  - `window.ASKAURA_SUPABASE_URL`
  - `window.ASKAURA_SUPABASE_ANON_KEY`
- Update all frontend references to use the new globals.
- Set values to the new AskAura Supabase URL and anon key.
- Optional temporary fallback:

```js
const SUPABASE_URL = window.ASKAURA_SUPABASE_URL || window.RILL_SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ASKAURA_SUPABASE_ANON_KEY || window.RILL_SUPABASE_ANON_KEY;
```

If fallback is added, mark it as temporary migration compatibility and remove it after Phase 0 is verified.

### 8.2 `admin.html`

Current behavior:

- `SUPABASE_URL` is hardcoded to the old cijing URL.
- `SUPABASE_ANON_KEY` is hardcoded to the old cijing anon key.
- admin session key is `rill_admin_token_v1`.

Required Phase 0 change:

- Set `SUPABASE_URL` to new AskAura Supabase URL.
- Set `SUPABASE_ANON_KEY` to new AskAura anon key.
- Rename `ADMIN_SESSION_KEY` to `askaura_admin_token_v1`.
- Rename exported config file from `rill-config.json` to `askaura-config.json`.
- Replace visible `RiLL Admin` / `此镜后台` copy with AskAura / 象问 wording.

### 8.3 `assets/app/storage.js`

Current keys:

```js
const HISTORY_KEY = "rill.history.v1";
const DAILY_ANCHOR_KEY = "rill.dailyAnchors.v1";
```

Required Phase 0 change:

- New write keys:

```js
const HISTORY_KEY = "askaura.history.v1";
const DAILY_ANCHOR_KEY = "askaura.dailyAnchors.v1";
```

- Add legacy read keys:

```js
const LEGACY_HISTORY_KEY = "rill.history.v1";
const LEGACY_DAILY_ANCHOR_KEY = "rill.dailyAnchors.v1";
```

- Load from AskAura key first.
- If missing or empty, load legacy key.
- New saves write only AskAura key.
- Do not delete legacy keys in Phase 0.

### 8.4 `assets/app/sync.js`

Current values:

```js
export const SESSION_KEY = "rill.authSession.v1";
const HISTORY_TABLE = "rill_reflection_records";
const DAILY_TABLE = "rill_daily_anchors";
```

Required Phase 0 change:

```js
export const SESSION_KEY = "askaura.authSession.v1";
const HISTORY_TABLE = "askaura_reflection_records";
const DAILY_TABLE = "askaura_daily_anchors";
```

Also update default globals:

```js
supabaseUrl = globalThis.ASKAURA_SUPABASE_URL
anonKey = globalThis.ASKAURA_SUPABASE_ANON_KEY
```

Optional temporary fallback to `RILL_*` is allowed only during migration.

### 8.5 `supabase/functions/_shared/runtime-config.ts`

Current table:

```text
rill_runtime_config
```

Required change:

```text
askaura_runtime_config
```

Keep the current config object shape in Phase 0.

### 8.6 `supabase/functions/admin-config/index.ts`

Current table:

```text
rill_runtime_config
```

Required change:

```text
askaura_runtime_config
```

Keep current actions and current secret names in Phase 0:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Do not switch to `ADMIN_CONFIG_SECRET` or admin email allowlist in Phase 0 unless code is explicitly rewritten and tested.

### 8.7 `supabase/functions/reading/index.ts`

Required Phase 0 changes:

- Keep request contract unchanged.
- Keep SSE behavior unchanged.
- Update response headers from `X-Rill-*` to `X-AskAura-*` if currently present.
- Ensure runtime config reads from `askaura_runtime_config` via the shared helper.

### 8.8 `supabase/functions/_shared/prompts/style.ts`

Required Phase 0 change:

- Replace system persona from RiLL/此镜 to AskAura/象问.
- Preserve content safety rules:
  - no deterministic fortune-telling
  - no fatalistic language
  - one concrete action

### 8.9 Tests

Update existing tests:

- `tests/sync.test.mjs` should expect `askaura_reflection_records` and `askaura_daily_anchors`.
- `tests/storage.test.mjs` should cover legacy `rill.*` read compatibility.
- `tests/clarify-contract.test.mjs` should keep existing reading contract assertions.

Add migration safety tests if practical:

- active frontend does not contain old Supabase ref after migration
- sync tables use `askaura_*`
- runtime config helper reads `askaura_runtime_config`
- admin config writes `askaura_runtime_config`

## 9. Supabase Setup Steps

### 9.1 Create new project

Create a new Supabase project for AskAura.

Record these privately:

- project ref
- project URL
- anon publishable key
- service role key

Do not put service role key in repo files or docs.

### 9.2 Link CLI

Use explicit project ref:

```powershell
supabase link --project-ref <ASKAURA_PROJECT_REF>
```

Verify:

```powershell
Get-Content supabase\.temp\project-ref
```

It must not be:

```text
icvegpfnpkyrebtojoca
```

### 9.3 Push migrations

Before pushing, confirm CLI is linked to AskAura project.

```powershell
supabase db push
```

If uncertain, stop and verify in Supabase Dashboard before pushing.

### 9.4 Set secrets

Use current code-compatible secret names:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AI_PROVIDER
XIAOMI_API_KEY
XIAOMI_BASE_URL
XIAOMI_MODEL
KIMI_API_KEY
KIMI_MODEL
ADMIN_USERNAME
ADMIN_PASSWORD_HASH
ADMIN_SESSION_SECRET
```

Only set provider secrets that are actually used.

Rotate the previously exposed Xiaomi key.

### 9.5 Deploy functions

Use explicit project ref and no JWT verification:

```powershell
supabase functions deploy reading --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy tarot-draw --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy admin-config --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
```

## 10. Auth Redirect Setup

In the new AskAura Supabase project, configure Auth URLs:

Production:

```text
https://askaura.vercel.app
https://askaura.vercel.app/
```

Local:

```text
http://127.0.0.1:5174
http://127.0.0.1:5174/
http://127.0.0.1:5174/index.html
```

Preview:

- add the Vercel preview URL used during verification
- remove it later if not needed

Do not add cijing production URLs to the new AskAura project unless there is a deliberate cross-project test, which Phase 0 should avoid.

## 11. Local Verification

Start local server:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

Open:

```text
http://127.0.0.1:5174/index.html
```

Verify:

- page title is `象问 AskAura`
- no request goes to `icvegpfnpkyrebtojoca`
- tarot mode generates a result
- meihua mode generates a result
- dual mode generates a result
- history records save locally under AskAura keys
- login uses the new AskAura Supabase project
- logged-in sync writes to `askaura_reflection_records`
- daily anchor sync writes to `askaura_daily_anchors`
- admin page can login and read/save `askaura_runtime_config`

## 12. Curl Smoke Tests

### 12.1 `reading`

```powershell
curl.exe -N -X POST "https://<ASKAURA_PROJECT_REF>.functions.supabase.co/reading" `
  -H "Authorization: Bearer <ASKAURA_ANON_KEY>" `
  -H "Content-Type: application/json" `
  -d "{\"mode\":\"reading\",\"cardName\":\"The Fool\",\"orientation\":\"upright\",\"intent\":\"clarity\",\"question\":\"我今天应该观察什么？\",\"round\":1,\"sessionHistory\":\"\",\"language\":\"zh\"}"
```

Expected:

- HTTP 200
- SSE chunks
- `data: [DONE]`
- no old brand in content unless still present in prompt and intentionally not migrated yet

### 12.2 `tarot-draw`

```powershell
curl.exe -i -X POST "https://<ASKAURA_PROJECT_REF>.functions.supabase.co/tarot-draw" `
  -H "Authorization: Bearer <ASKAURA_ANON_KEY>" `
  -H "Content-Type: application/json" `
  -d "{\"card\":\"The Fool\",\"orientation\":\"upright\",\"intent\":\"clarity\",\"question\":\"我今天应该观察什么？\"}"
```

Expected:

```json
{"ok":true}
```

Do not expect a card object from this endpoint in Phase 0.

### 12.3 `admin-config`

Public config:

```powershell
curl.exe -i -X POST "https://<ASKAURA_PROJECT_REF>.functions.supabase.co/admin-config" `
  -H "Authorization: Bearer <ASKAURA_ANON_KEY>" `
  -H "Content-Type: application/json" `
  -d "{\"action\":\"public\"}"
```

Expected:

- HTTP 200
- masked config
- no API key
- no service role key

Login:

```powershell
curl.exe -i -X POST "https://<ASKAURA_PROJECT_REF>.functions.supabase.co/admin-config" `
  -H "Authorization: Bearer <ASKAURA_ANON_KEY>" `
  -H "Content-Type: application/json" `
  -d "{\"action\":\"login\",\"username\":\"<ADMIN_USERNAME>\",\"password\":\"<ADMIN_PASSWORD>\"}"
```

Expected:

- HTTP 200 with token if credentials are correct
- HTTP 401 if credentials are wrong

## 13. Test Commands

Run:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

If migration safety tests are added, include them in this set.

## 14. Static Scans

Before production cutover:

```powershell
rg -n "icvegpfnpkyrebtojoca" index.html admin.html assets supabase README.md DEPLOY.md AGENTS.md CLAUDE.md docs
```

Allowed only in:

- migration docs
- audit notes
- explicit old-project warning text

Not allowed in:

- active frontend config
- active admin config
- sync client
- runtime config helper
- deploy commands

Scan old brand residue:

```powershell
rg -n "RiLL|cijing|rill_runtime_config|rill_reflection_records|rill_daily_anchors|RILL_SUPABASE" index.html admin.html assets supabase AGENTS.md CLAUDE.md README.md DEPLOY.md
```

Allowed only when:

- explicitly marked as legacy compatibility
- used in migration fallback reads
- used in warnings not to deploy to old project

## 15. Preview And Production Cutover

### 15.1 Vercel Preview

- Deploy preview.
- Add preview URL to new Supabase Auth redirects if auth is tested on preview.
- Run browser smoke test.
- Confirm network requests go only to new AskAura Supabase.
- Confirm old cijing Supabase receives no new AskAura smoke records.

### 15.2 Production

- Deploy production only after preview passes.
- Run production smoke test:
  - tarot
  - meihua
  - dual
  - history
  - login
  - sync
  - admin config
- Check new Supabase tables.
- Check old cijing tables for unexpected new AskAura smoke records.

## 16. Rollback Plan

If frontend cutover fails:

- Roll back Vercel to the previous deployment.
- Do not modify old cijing backend.
- Fix new project config or code on a new preview.

If new migrations are wrong:

- Fix only the new AskAura Supabase project.
- Do not apply corrective migrations to old cijing.

If secrets are wrong:

- Update only new AskAura Supabase secrets.
- Redeploy functions only if function code changed.

If Auth redirects are wrong:

- Fix new AskAura Supabase Auth URL settings.
- Retest login and password reset.

## 17. Phase 0 Definition Of Done

Phase 0 is done only when all are true:

- AskAura frontend uses new Supabase URL.
- AskAura admin uses new Supabase URL.
- Active code no longer points to `icvegpfnpkyrebtojoca`.
- New data writes to `askaura_reflection_records`.
- New daily anchors write to `askaura_daily_anchors`.
- Runtime config reads/writes `askaura_runtime_config`.
- localStorage writes to AskAura keys.
- old `rill.*` localStorage data remains readable.
- `reading`, `tarot-draw`, and `admin-config` are deployed to new AskAura project with `--no-verify-jwt`.
- Auth redirects return to AskAura.
- All existing tests pass.
- Browser smoke test passes locally and on preview.
- Production smoke test passes.
- Old cijing Supabase receives no new AskAura smoke data.

