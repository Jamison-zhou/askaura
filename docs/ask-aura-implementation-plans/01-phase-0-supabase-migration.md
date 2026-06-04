# Phase 0: Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move AskAura from the old cijing/RiLL Supabase project to a dedicated AskAura Supabase project with minimum behavior change.

**Architecture:** Keep the current frontend, request contracts, storage shape, and sync shape. Rename backend resources from `rill_*` to `askaura_*`, deploy functions to the new Supabase project, and preserve local legacy data reads.

**Tech Stack:** Static HTML, Supabase Edge Functions, Supabase Auth REST, Supabase RLS, Node test scripts.

---

## Hard Boundaries

- Do not modify old project `icvegpfnpkyrebtojoca`.
- Do not migrate old cijing cloud data by default.
- Do not switch record IDs from `text` to `uuid`.
- Do not add AI follow-up, spreads, sharing, community, or paid features.
- Do not change `reading` contract from `mode: "reading"` / `language: "zh" | "en"`.
- Do not expect `tarot-draw` to return a card; it currently returns `{ ok: true }`.

## Task 1: Project And Secret Setup

**Files:** none committed.

- [ ] Create a new Supabase project for AskAura.
- [ ] Record project ref privately as `<ASKAURA_PROJECT_REF>`.
- [ ] Record project URL privately as `https://<ASKAURA_PROJECT_REF>.supabase.co`.
- [ ] Record anon publishable key for frontend use.
- [ ] Store service role key only in Supabase secrets, never in repo files.
- [ ] Set these Supabase secrets using current code-compatible names:

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

- [ ] Rotate the previously exposed Xiaomi key before production use.

## Task 2: Add AskAura Migrations

**Files:**
- Create: `supabase/migrations/<timestamp>_askaura_runtime_config.sql`
- Create: `supabase/migrations/<timestamp>_askaura_user_reflections.sql`

- [ ] Create `askaura_runtime_config` with current `rill_runtime_config` shape:

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
```

- [ ] Seed `id = 'default'` config with the existing runtime config shape.
- [ ] Create `askaura_reflection_records` with `id text primary key`.
- [ ] Include mode check for current real modes: `tarot`, `meihua`, `dual`, `daily`.
- [ ] Create `askaura_daily_anchors` with `(user_id, date_key)` primary key.
- [ ] Enable RLS on user tables.
- [ ] Add select/insert/update/delete policies with `auth.uid() = user_id`.
- [ ] Confirm new migrations do not alter `rill_*` tables.

## Task 3: Update Function Table Names And Brand

**Files:**
- Modify: `supabase/functions/_shared/runtime-config.ts`
- Modify: `supabase/functions/admin-config/index.ts`
- Modify: `supabase/functions/reading/index.ts`
- Modify: `supabase/functions/_shared/prompts/style.ts`

- [ ] Replace `rill_runtime_config` with `askaura_runtime_config`.
- [ ] Keep `admin-config` actions unchanged: `public`, `login`, `get`, `save`.
- [ ] Keep admin secrets unchanged: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`.
- [ ] Replace `X-Rill-*` response headers with `X-AskAura-*` where present.
- [ ] Update system prompt persona from RiLL/此镜 to AskAura/象问.
- [ ] Preserve content safety rules: no deterministic predictions, no fatalism, one concrete action.

## Task 4: Deploy Functions To New Project

**Files:** none committed.

- [ ] Link CLI to new project:

```powershell
supabase link --project-ref <ASKAURA_PROJECT_REF>
Get-Content supabase\.temp\project-ref
```

- [ ] Confirm output is not `icvegpfnpkyrebtojoca`.
- [ ] Push migrations:

```powershell
supabase db push
```

- [ ] Deploy functions with explicit no-JWT verification:

```powershell
supabase functions deploy reading --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy tarot-draw --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy admin-config --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
```

## Task 5: Switch Frontend And Admin

**Files:**
- Modify: `index.html`
- Modify: `admin.html`
- Modify: `assets/app/sync.js`
- Modify: `assets/app/storage.js`

- [ ] In `index.html`, replace `window.RILL_SUPABASE_URL` with `window.ASKAURA_SUPABASE_URL`.
- [ ] Replace `window.RILL_SUPABASE_ANON_KEY` with `window.ASKAURA_SUPABASE_ANON_KEY`.
- [ ] Use the new AskAura Supabase URL and anon key.
- [ ] In `assets/app/sync.js`, change:

```js
export const SESSION_KEY = "askaura.authSession.v1";
const HISTORY_TABLE = "askaura_reflection_records";
const DAILY_TABLE = "askaura_daily_anchors";
```

- [ ] Update sync defaults to read `globalThis.ASKAURA_SUPABASE_URL` and `globalThis.ASKAURA_SUPABASE_ANON_KEY`.
- [ ] In `assets/app/storage.js`, write to:

```js
const HISTORY_KEY = "askaura.history.v1";
const DAILY_ANCHOR_KEY = "askaura.dailyAnchors.v1";
```

- [ ] Add legacy read fallback for:

```js
const LEGACY_HISTORY_KEY = "rill.history.v1";
const LEGACY_DAILY_ANCHOR_KEY = "rill.dailyAnchors.v1";
```

- [ ] Do not delete old localStorage keys in Phase 0.
- [ ] In `admin.html`, switch to new Supabase URL/anon key.
- [ ] Rename admin session key to `askaura_admin_token_v1`.
- [ ] Rename exported config file to `askaura-config.json`.
- [ ] Replace visible admin brand copy with AskAura / 象问.

## Task 6: Update Tests

**Files:**
- Modify: `tests/sync.test.mjs`
- Modify: `tests/storage.test.mjs`
- Modify: `tests/clarify-contract.test.mjs` only if contract assertions need new brand checks.

- [ ] Update sync tests to expect `askaura_reflection_records`.
- [ ] Update sync tests to expect `askaura_daily_anchors`.
- [ ] Update session key expectation to `askaura.authSession.v1`.
- [ ] Add storage test proving legacy `rill.history.v1` is readable when AskAura key is empty.
- [ ] Add storage test proving new saves write only AskAura keys.
- [ ] Keep current clarification contract unchanged.

## Task 7: Verify Locally

**Files:** none.

- [ ] Run tests:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

- [ ] Start local server:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

- [ ] Open `http://127.0.0.1:5174/index.html`.
- [ ] Confirm no Network request goes to `icvegpfnpkyrebtojoca`.
- [ ] Run tarot, meihua, and dual smoke tests.
- [ ] Confirm login/sync writes to new AskAura tables.
- [ ] Confirm admin config reads/writes `askaura_runtime_config`.

## Task 8: Preview And Production

**Files:** deployment only.

- [ ] Deploy Vercel preview.
- [ ] Add preview URL to new Supabase Auth redirects if testing auth on preview.
- [ ] Run preview smoke test.
- [ ] Confirm old cijing project receives no new AskAura smoke data.
- [ ] Deploy production only after preview passes.
- [ ] Run production smoke test.

## Definition Of Done

- [ ] Active code no longer points to `icvegpfnpkyrebtojoca`.
- [ ] New records write to `askaura_reflection_records`.
- [ ] Daily anchors write to `askaura_daily_anchors`.
- [ ] Runtime config uses `askaura_runtime_config`.
- [ ] localStorage writes AskAura keys and can read legacy keys.
- [ ] `reading`, `tarot-draw`, and `admin-config` are deployed to the new project.
- [ ] All tests pass.
- [ ] Local and preview browser smoke tests pass.
- [ ] Old cijing project has no new AskAura smoke data.
