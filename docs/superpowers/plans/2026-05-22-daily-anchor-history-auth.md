# 日课回看与账号同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build daily anchors, local reflection history, email/password login, and Supabase-backed cross-device sync for RiLL.

**Architecture:** Keep the static app architecture. Extract browser-side persistence, daily-anchor, and Supabase auth/sync behavior into small plain-JS modules loaded by `index.html`, then wire them into the existing result flow. Add SQL migrations for per-user records with RLS.

**Tech Stack:** Static HTML/CSS/JS, localStorage, Supabase Auth REST API, Supabase PostgREST, Supabase SQL migrations, Node-based behavior tests.

---

### Task 1: Core Record Utilities

**Files:**
- Create: `assets/app/storage.js`
- Create: `tests/storage.test.mjs`
- Modify: `index.html`

- [x] Write failing tests for saving, deduping, limiting to 21 history records, and daily-anchor date reuse.
- [x] Run `node tests/storage.test.mjs` and confirm failure because module does not exist.
- [x] Implement `assets/app/storage.js` with `loadHistory`, `saveHistoryRecord`, `mergeHistory`, `loadDailyAnchor`, `saveDailyAnchor`, and `todayKey`.
- [x] Run `node tests/storage.test.mjs` and confirm pass.

### Task 2: Supabase Auth And Sync Client

**Files:**
- Create: `assets/app/sync.js`
- Create: `tests/sync.test.mjs`
- Create: `supabase/migrations/202605220001_user_reflections.sql`
- Modify: `index.html`

- [x] Write failing tests for auth header construction, local/cloud merge behavior, and unauthenticated no-op sync.
- [x] Run `node tests/sync.test.mjs` and confirm failure because module does not exist.
- [x] Implement REST-based signup/login/logout/session helpers against Supabase Auth.
- [x] Implement cloud sync helpers for `rill_reflection_records` and `rill_daily_anchors`.
- [x] Add migration tables and RLS policies.
- [x] Run `node tests/sync.test.mjs` and confirm pass.

### Task 3: UI Wiring

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [x] Add left-rail `回看` and `登录/我的` entry points.
- [x] Add history panel with latest records and clear action.
- [x] Add auth panel with email/password login/register and logout.
- [x] Save successful tarot/meihua/daily results to local history.
- [x] Make daily mode reuse today's anchor before requesting a new one.
- [x] Sync after login and after successful result generation when authenticated.

### Task 4: Verification And Commit

**Files:**
- Modify as needed from prior tasks.

- [x] Run `node tests/storage.test.mjs`.
- [x] Run `node tests/sync.test.mjs`.
- [x] Run `node -e` script syntax check for `index.html` inline scripts.
- [ ] Manually verify local page loads.
- [ ] Commit with Chinese commit message and author `周剑辉⚡CodeNinja <17751764093@163.com>`.
