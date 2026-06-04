# Phase 7: Long-Term Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give signed-in users a quiet long-term view of their own repeated themes, symbols, actions, and one-month echoes without creating dependency loops or fate-style predictions.

**Architecture:** Build from existing private history, action status, review notes, cards, gua, and favorites. Store only user-owned companion metadata in Supabase; derive theme maps locally from saved records and expose an optional one-month echo when enough history exists.

**Tech Stack:** Static HTML/CSS/JS, Supabase Auth/REST, RLS, existing `storage.js` and `sync.js`, Node `.mjs` contract tests, browser smoke tests.

---

## Product Boundaries

- No punishment for missed days.
- No streak pressure, aggressive reminders, or dependency loops.
- No fate, fortune, or deterministic trend claims.
- No public profile or sharing by default.
- Companion data is private and owned by the signed-in user.
- The feature summarizes repeated personal patterns; it does not predict outcomes.

## File Structure

- Create: `supabase/migrations/202606030011_askaura_companion_profile.sql`
  - Stores user-owned companion profile metadata and quiet achievement flags.
- Create: `assets/app/companion.js`
  - Derives theme map, symbol/action collection, observation trail, and one-month echo from local records.
- Modify: `assets/app/sync.js`
  - Adds `loadCompanionProfile` and `saveCompanionProfile`; direct access is only to own rows.
- Modify: `index.html`
  - Adds companion panel and a small entry in utility navigation.
- Modify: `styles.css`
  - Adds compact companion panel styles.
- Add: `tests/phase7-companion-contract.test.mjs`
  - Locks product boundaries, private RLS, derivation behavior, and UI presence.

---

## Current Status

- [x] Contract test added.
- [x] Private companion profile schema deployed.
- [x] Companion derivation module implemented.
- [x] Front-end companion panel deployed.
- [x] Signed-in cloud save/load smoke completed.
- [x] Browser smoke passes desktop and 390px mobile.

## Task 1: Contract Test First

**Files:**
- Create: `tests/phase7-companion-contract.test.mjs`

- [ ] Add contract test that checks:
  - companion profile table exists;
  - RLS uses `auth.uid() = user_id`;
  - `assets/app/companion.js` exports `deriveCompanionSnapshot`;
  - no deterministic/fate words appear in companion UI copy;
  - `index.html` contains `companion-panel`;
  - `sync.js` exposes `loadCompanionProfile` and `saveCompanionProfile`.

Run:

```powershell
node --experimental-vm-modules tests/phase7-companion-contract.test.mjs
```

Expected before implementation: FAIL.

## Task 2: Private Companion Schema

**Files:**
- Create: `supabase/migrations/202606030011_askaura_companion_profile.sql`

- [ ] Create table:

```sql
create table if not exists public.askaura_companion_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  profile jsonb not null default '{}'::jsonb,
  quiet_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.askaura_companion_profiles enable row level security;

create policy "companion_profiles_select_own"
  on public.askaura_companion_profiles
  for select
  using (auth.uid() = user_id);

create policy "companion_profiles_insert_own"
  on public.askaura_companion_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "companion_profiles_update_own"
  on public.askaura_companion_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Task 3: Companion Derivation Module

**Files:**
- Create: `assets/app/companion.js`

- [ ] Implement `deriveCompanionSnapshot(records, now)`:
  - uses at most existing local records;
  - counts repeated modes, symbols, and action statuses;
  - extracts top action words from `action`;
  - returns one-month echo only when a record is at least 28 days old;
  - never returns prediction language.

## Task 4: Sync Wrappers

**Files:**
- Modify: `assets/app/sync.js`

- [ ] Add REST wrappers:
  - `loadCompanionProfile()`
  - `saveCompanionProfile(profile)`

Both require a signed-in session and only access `askaura_companion_profiles`.

## Task 5: Front-End Companion Panel

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [ ] Add a quiet utility entry next to History/Auth.
- [ ] Add `companion-panel` with:
  - observation trail summary;
  - personal theme map;
  - symbol/action collection;
  - one-month echo if available;
  - quiet flags, not streaks.
- [ ] Do not add notification prompts or streak counters.

## Task 6: Verification And Deployment

- [ ] Run all `.mjs` tests.
- [ ] Push migration with `supabase db push --linked`.
- [ ] Deploy front end with `npx vercel deploy --prod --yes`.
- [ ] Smoke:
  - production page contains companion entry and panel;
  - desktop and 390px mobile have no horizontal overflow;
  - signed-in save/load works with a temporary Admin API user;
  - returned data belongs only to that user.

## Rollback

- Hide the companion entry and panel.
- Keep the private table; no public data exists.
- If cloud profile behavior is wrong, stop calling `saveCompanionProfile` and rely on derived local records.
