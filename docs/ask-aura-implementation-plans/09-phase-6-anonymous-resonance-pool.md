# Phase 6: Anonymous Resonance Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in users optionally submit a redacted theme/action from a saved result into an anonymous resonance pool, then browse similar anonymous themes without exposing raw questions or identities.

**Architecture:** Add a dedicated public-submission table with strict redaction, separate from private history and private links. All writes go through an Edge Function that verifies ownership, removes private fields, and stores only theme/action/category metadata; public reads return aggregated anonymous entries and lightweight reactions.

**Tech Stack:** Static HTML/CSS/JS, Supabase Auth/REST, Supabase Edge Functions, RLS, Node `.mjs` contract tests, browser smoke tests.

---

## Current Status

- [x] Contract test added and passing.
- [x] Database schema and RLS deployed.
- [x] `resonance-pool` Edge Function deployed.
- [x] Front-end submit/open/revoke/reaction UI deployed.
- [x] Anonymous submit returns `401`.
- [x] Public list returns only redacted fields and no `user_id`.
- [x] Public reaction increments anonymous count.
- [x] Revoked submissions disappear from public list.
- [x] Browser smoke passes on desktop and 390px mobile.
- [x] Signed-in submit/revoke smoke through Supabase Auth is verified with a temporary Admin API user, then cleaned up.

## Non-Negotiable Product Boundaries

- Raw original questions never enter the pool by default.
- No direct messages, comments, profiles, follows, rankings, or trending lists.
- Submissions are anonymous and revocable by the submitting user.
- The pool is for resonance and good-question templates, not public social validation.
- Public reads must not expose `user_id`, email, auth metadata, private links, followups, review notes, or full generated content.

## File Structure

- Create: `supabase/migrations/202606030010_askaura_resonance_pool.sql`
  - Defines anonymous submissions, reactions, RLS, indexes, and revocation fields.
- Create: `supabase/functions/resonance-pool/index.ts`
  - Handles `submit`, `revoke`, `list`, and `react` actions.
- Modify: `supabase/config.toml`
  - Registers `resonance-pool` with `verify_jwt = false` for custom auth handling.
- Modify: `assets/app/sync.js`
  - Adds function-call wrappers only; does not directly access resonance tables.
- Modify: `index.html`
  - Adds explicit opt-in submission and read-only resonance browsing UI.
- Modify: `styles.css`
  - Adds compact pool/reaction styling.
- Add: `tests/phase6-resonance-pool-contract.test.mjs`
  - Locks privacy, RLS, action contracts, and front-end boundaries.

---

## Task 1: Contract Test First

**Files:**
- Create: `tests/phase6-resonance-pool-contract.test.mjs`

- [ ] **Step 1: Add failing privacy and contract tests**

Use this test skeleton:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/202606030010_askaura_resonance_pool.sql", import.meta.url), "utf8");
const fn = readFileSync(new URL("../supabase/functions/resonance-pool/index.ts", import.meta.url), "utf8");
const sync = readFileSync(new URL("../assets/app/sync.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(migration, /create table if not exists public\.askaura_resonance_submissions/);
assert.match(migration, /alter table public\.askaura_resonance_submissions enable row level security/);
assert.match(migration, /using \(false\)|auth\.uid\(\) = user_id/);
assert.doesNotMatch(fn, /user\.email|access_token|refresh_token|service_role/i);
assert.match(fn, /action === "submit"/);
assert.match(fn, /action === "revoke"/);
assert.match(fn, /action === "list"/);
assert.match(fn, /action === "react"/);
assert.match(fn, /getOwnedRecord/);
assert.match(fn, /redactSubmissionPayload/);
assert.match(sync, /submitResonance/);
assert.match(sync, /revokeResonance/);
assert.match(sync, /loadResonancePool/);
assert.doesNotMatch(sync, /askaura_resonance_submissions/);
assert.match(html, /id="resonance-submit-btn"/);
assert.match(html, /id="resonance-panel"/);
assert.match(html, /data-resonance-reaction/);

console.log("phase6 resonance pool contract passed");
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
node --experimental-vm-modules tests/phase6-resonance-pool-contract.test.mjs
```

Expected: FAIL because the migration/function/UI do not exist yet.

---

## Task 2: Database And RLS

**Files:**
- Create: `supabase/migrations/202606030010_askaura_resonance_pool.sql`

- [ ] **Step 1: Create the migration**

Use this schema:

```sql
create table if not exists public.askaura_resonance_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  mode text not null check (mode in ('tarot', 'meihua', 'dual', 'daily')),
  theme text not null,
  action text not null,
  symbol text not null default '',
  category text not null default 'general',
  language text not null default 'zh',
  source_created_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, record_id)
);

create table if not exists public.askaura_resonance_reactions (
  submission_id uuid not null references public.askaura_resonance_submissions(id) on delete cascade,
  reaction text not null check (reaction in ('same', 'useful')),
  anon_fingerprint text not null,
  created_at timestamptz not null default now(),
  primary key (submission_id, reaction, anon_fingerprint)
);

alter table public.askaura_resonance_submissions enable row level security;
alter table public.askaura_resonance_reactions enable row level security;

create policy "resonance_submissions_select_public_active"
  on public.askaura_resonance_submissions
  for select
  using (revoked_at is null);

create policy "resonance_submissions_insert_own"
  on public.askaura_resonance_submissions
  for insert
  with check (auth.uid() = user_id);

create policy "resonance_submissions_update_own"
  on public.askaura_resonance_submissions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "resonance_reactions_select_public"
  on public.askaura_resonance_reactions
  for select
  using (true);

create policy "resonance_reactions_no_direct_insert"
  on public.askaura_resonance_reactions
  for insert
  with check (false);

create index if not exists resonance_submissions_public_idx
  on public.askaura_resonance_submissions (language, category, created_at desc)
  where revoked_at is null;
```

- [ ] **Step 2: Run migration lint or push dry-run**

Run:

```powershell
supabase db push --linked --dry-run
```

Expected: lists `202606030010_askaura_resonance_pool.sql`.

---

## Task 3: Edge Function

**Files:**
- Create: `supabase/functions/resonance-pool/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Register the function**

Add:

```toml
[functions.resonance-pool]
verify_jwt = false
```

- [ ] **Step 2: Implement action handlers**

Function responsibilities:

```ts
// submit: require login, verify record ownership, redact to theme/action/symbol/category
// revoke: require login, set revoked_at for own submission
// list: public read, return active redacted submissions only
// react: public write through function, hash client fingerprint, no profile identity
```

Required helper names:

```ts
function redactSubmissionPayload(record: Record<string, unknown>) {
  return {
    theme: cleanText(parseToken(record.answer, "JUDGMENT") || parseToken(record.answer, "CORE_QUESTION") || record.action, 220),
    action: cleanText(record.action || parseToken(record.answer, "ACTION"), 180),
    symbol: cleanText(primarySymbol(record), 80),
    category: categoryFromMode(record.mode),
  };
}
```

- [ ] **Step 3: Verify anonymous submit is rejected**

Run after deployment:

```powershell
node --input-type=module -e "/* POST action=submit with anon key; expect 401 */"
```

Expected: `401`.

---

## Task 4: Sync Client Wrappers

**Files:**
- Modify: `assets/app/sync.js`

- [ ] **Step 1: Add function wrapper constant**

```js
const RESONANCE_FUNCTION = "/functions/v1/resonance-pool";
```

- [ ] **Step 2: Add methods**

Add methods to `createSyncClient`:

```js
async function submitResonance(recordId) {
  const session = await ensureSession();
  if (!session?.access_token) return { status: "signed-out" };
  return requestFunction(RESONANCE_FUNCTION, {
    method: "POST",
    session,
    body: { action: "submit", recordId },
  });
}

async function revokeResonance(id) {
  const session = await ensureSession();
  if (!session?.access_token) return { status: "signed-out" };
  return requestFunction(RESONANCE_FUNCTION, {
    method: "POST",
    session,
    body: { action: "revoke", id },
  });
}

async function loadResonancePool({ language = "zh", category = "all" } = {}) {
  return requestFunction(RESONANCE_FUNCTION, {
    method: "POST",
    body: { action: "list", language, category },
  });
}
```

- [ ] **Step 3: Export methods**

Add `submitResonance`, `revokeResonance`, and `loadResonancePool` to the returned client object.

---

## Task 5: Front-End UI

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [ ] **Step 1: Add explicit opt-in controls**

Add near the share panel:

```html
<button class="secondary muted" type="button" id="resonance-submit-btn" data-i18n="resonanceSubmit">匿名放入共鸣池</button>
<button class="secondary muted" type="button" id="resonance-open-btn" data-i18n="resonanceOpen">看看相似主题</button>
```

- [ ] **Step 2: Add read-only panel**

```html
<div class="utility-panel" id="resonance-panel" hidden aria-hidden="true">
  <section class="utility-sheet" aria-label="共鸣池">
    <button class="utility-close" type="button" data-close-utility aria-label="关闭共鸣池">×</button>
    <p class="panel-kicker" data-i18n="resonanceKicker">匿名共鸣</p>
    <div class="resonance-list" id="resonance-list"></div>
  </section>
</div>
```

- [ ] **Step 3: Add event handlers**

Handlers must:

- require login for submit,
- never include `lastQuestion`,
- render only `theme`, `action`, `symbol`, `category`, and reaction counts,
- open account panel if signed out.

- [ ] **Step 4: Add compact styles**

Use dense repeated rows, not social cards:

```css
.resonance-list {
  display: grid;
  gap: 10px;
}

.resonance-item {
  border-top: 1px solid var(--line-soft);
  padding: 12px 0;
}
```

---

## Task 6: Verification And Deployment

**Files:**
- Modify: `docs/ask-aura-implementation-plans/09-phase-6-anonymous-resonance-pool.md`

- [ ] **Step 1: Run all tests**

Run:

```powershell
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true } }; if ($failed) { exit 1 }
```

Expected: all tests pass, including `phase6 resonance pool contract passed`.

- [ ] **Step 2: Push migration**

Run:

```powershell
supabase db push --linked
```

Expected: migration applied.

- [ ] **Step 3: Deploy function**

Run:

```powershell
supabase functions deploy resonance-pool --project-ref oeqekrlodqxjlakdjqpu --no-verify-jwt
```

Expected: function deployed.

- [ ] **Step 4: Deploy front end**

Run:

```powershell
npx vercel deploy --prod --yes
```

Expected: production deployment ready and aliased to `https://askaura.vercel.app`.

- [ ] **Step 5: Live smoke**

Required evidence:

- anonymous submit returns `401`;
- signed-in submit returns `200`;
- public list returns active redacted entries;
- revoked submission disappears from public list;
- returned JSON does not contain raw question, email, `user_id`, followups, review note, or full answer;
- browser desktop and 390px mobile have no horizontal overflow.

---

## Rollback

- Hide the front-end resonance buttons by setting them `hidden`.
- Revoke all public submissions:

```sql
update public.askaura_resonance_submissions
set revoked_at = coalesce(revoked_at, now()), updated_at = now()
where revoked_at is null;
```

- Keep the table for audit and user revocation history; do not drop data during emergency rollback.

## Self-Review

- Spec coverage: covers anonymous submission, similar theme browsing, good-question extraction foundation, lightweight reactions, revocation, schema/RLS, privacy failure modes, rollback, tests, and smoke.
- Placeholder scan: no `TBD`, no undefined future-only steps.
- Type consistency: method names match across function, sync wrapper, UI, and tests.
