# Phase 9: Operations And Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-safe quality monitoring, prompt version tracking, content-safety flags, and admin rollback controls without storing raw private questions or full generated answers.

**Architecture:** Phase 9A records only metadata from server-side reading calls. The Edge Function scans output in memory, stores compact flags and token status, and exposes admin runtime switches for quality logging and emergency rollback. Phase 9B can add richer CMS/A-B systems later after this low-risk foundation is stable.

**Tech Stack:** Supabase Edge Functions, Postgres/RLS, existing runtime config, static admin UI, Node `.mjs` contract tests, HTTP and browser smoke tests.

---

## Current Decision

Do Phase 9A first.

Do not build a full prompt CMS, public analytics dashboard, or A/B testing framework yet. These are broader systems and should be separate 9B/9C plans after metadata logging proves useful.

## Product And Privacy Boundaries

- Quality monitoring must not store raw user questions.
- Quality monitoring must not store full generated answers.
- Content safety scan may inspect generated text in memory, but stores only flag names and counts.
- Prompt version is metadata, not user content.
- Admin rollback must be config-based first: disable quality logging, disable pro routing, lower model caps, and preserve existing user data.
- Any future A/B test must be server-assigned and privacy-safe; the browser must not choose model or prompt authority.

## Risk Register

| Risk | Why It Matters | Required Guard |
| --- | --- | --- |
| Raw private text in metrics | Ops data can become a second private-content database | Contract test rejects question/answer/fullText columns and logging fields |
| Overbroad direct access | Metrics can reveal user behavior | RLS denies direct client CRUD; writes use service role only |
| Safety scan overreach | Bad scanner could block normal reflective text | Phase 9A records flags only; it does not block output |
| Rollback too slow | Model/prompt issue can affect every user | Runtime config has `ops.qualityLoggingEnabled`, `ops.contentSafetyScanEnabled`, and prompt version |
| Prompt drift | Later edits become impossible to compare | Every reading event records prompt version and route metadata |
| A/B misuse | Experiments can become hidden product changes | Phase 9A only reserves config fields; no active experiment routing |

## File Structure

- Create: `supabase/migrations/202606030013_askaura_quality_events.sql`
  - Stores privacy-safe quality metadata only.
- Create: `supabase/functions/_shared/quality.ts`
  - Scans generated output in memory and writes compact quality events.
- Modify: `supabase/functions/_shared/runtime-config.ts`
  - Adds `ops` config with prompt version, logging, scanner, and experiment placeholders.
- Modify: `supabase/functions/admin-config/index.ts`
  - Sanitizes ops config.
- Modify: `supabase/functions/reading/index.ts`
  - Records quality event after token validation; does not store question or answer.
- Modify: `admin.html`
  - Adds ops controls for quality logging, content scanner, prompt version, and emergency rollback notes.
- Add: `tests/phase9-ops-quality-contract.test.mjs`
  - Locks schema, RLS, privacy, prompt version, safety flags, and admin controls.

---

## Current Status

- [x] Phase 9A implementation plan written.
- [x] Quality event schema deployed.
- [x] Server-side quality helper implemented.
- [x] Reading function records privacy-safe metadata.
- [x] Admin ops controls added.
- [x] Contract tests and full local tests pass.
- [x] Supabase functions deployed and HTTP smoke passed.
- [x] Browser smoke passed for admin Ops controls at desktop and 390px mobile.

Deployment note:

- `supabase db push --linked` was blocked by remote Postgres TLS/timeout errors.
- The same SQL was applied successfully with `supabase db query --linked -f supabase/migrations/202606030013_askaura_quality_events.sql`.
- Migration history was then recorded with `version='202606030013'` and `name='askaura_quality_events'` in `supabase_migrations.schema_migrations`.

## Task 1: Contract Test First

**Files:**
- Add: `tests/phase9-ops-quality-contract.test.mjs`

- [ ] Add a test that checks:
  - `askaura_quality_events` exists;
  - no `question`, `answer`, or `full_text` columns exist in the schema;
  - direct client CRUD is denied by RLS;
  - `quality.ts` exports `scanContentSafety` and `recordQualityEvent`;
  - `reading/index.ts` records prompt version and quality metadata;
  - `runtime-config.ts`, `admin-config`, and `admin.html` include ops kill switches.

Run:

```powershell
node --experimental-vm-modules tests/phase9-ops-quality-contract.test.mjs
```

Expected before implementation: FAIL.

## Task 2: Privacy-Safe Quality Schema

**Files:**
- Add: `supabase/migrations/202606030013_askaura_quality_events.sql`

- [ ] Create `askaura_quality_events` with route and safety metadata only:

```sql
create table if not exists public.askaura_quality_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  request_id text not null default gen_random_uuid()::text,
  prompt_version text not null default 'default',
  mode text not null default '',
  entry text not null default '',
  tier text not null default 'basic',
  provider text not null default '',
  model text not null default '',
  thinking text not null default 'disabled',
  token_ok boolean not null default true,
  missing_tokens text[] not null default '{}'::text[],
  safety_flags text[] not null default '{}'::text[],
  output_chars integer not null default 0,
  latency_ms integer not null default 0,
  status text not null default 'ok' check (status in ('ok', 'warning', 'error')),
  created_at timestamptz not null default now()
);
```

- [ ] Deny direct select/insert/update/delete from clients.
- [ ] Add indexes for `created_at`, `prompt_version`, and route dimensions.

## Task 3: Quality Helper

**Files:**
- Add: `supabase/functions/_shared/quality.ts`

- [ ] Implement:
  - `scanContentSafety(text)` returns flag names only;
  - `recordQualityEvent(env, event)` writes with service role only;
  - helper never accepts or stores raw question/full answer fields.

Safety flags for Phase 9A:

- `deterministic_future`
- `fortune_change`
- `reunion_probability`
- `wealth_luck`
- `medical_legal_financial_guarantee`
- `overlong_output`

## Task 4: Runtime Ops Config

**Files:**
- Modify: `supabase/functions/_shared/runtime-config.ts`
- Modify: `supabase/functions/admin-config/index.ts`
- Modify: `admin.html`

- [ ] Add defaults:

```ts
ops: {
  promptVersion: "askaura-2026-06-03",
  qualityLoggingEnabled: true,
  contentSafetyScanEnabled: true,
  experimentKey: "",
  rollbackNote: "",
}
```

- [ ] Admin must sanitize booleans and short strings only.
- [ ] Admin page must expose quality logging and scanner toggles.

## Task 5: Reading Integration

**Files:**
- Modify: `supabase/functions/reading/index.ts`

- [ ] Capture `const startedAt = Date.now()` before provider call.
- [ ] After token validation, run scanner only if enabled.
- [ ] Record quality event only if quality logging is enabled.
- [ ] Store only prompt version, route, token status, safety flags, output length, latency, and status.
- [ ] Do not store `reqBody.question`, `fullText`, `followupQuestion`, or generated content.

## Task 6: Verification And Deployment

Run:

```powershell
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true } }; if ($failed) { exit 1 }
```

Deploy:

```powershell
supabase db push --linked
supabase functions deploy reading --project-ref oeqekrlodqxjlakdjqpu --no-verify-jwt
supabase functions deploy admin-config --project-ref oeqekrlodqxjlakdjqpu --no-verify-jwt
npx vercel deploy --prod --yes
```

HTTP smoke:

- Reading still returns `200` and existing model headers.
- Quality event insert does not expose raw question or full answer.
- Turning `ops.qualityLoggingEnabled=false` stops new quality events.

Browser smoke:

- Main page still loads.
- Admin page shows ops controls without layout overflow.

---

## Completion Criteria

- Quality events are metadata-only.
- No raw private question or full generated answer is stored in ops tables.
- Direct client CRUD to quality events is denied.
- Prompt version is recorded for every logged reading event.
- Content scanner stores flags only and does not block user output in Phase 9A.
- Admin can disable quality logging and safety scanning through runtime config.
- Full local tests, migration push, function deploy, HTTP smoke, and browser smoke pass.
