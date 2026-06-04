# Refactor Slice: History Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract history record normalization and cloud row mapping into a shared module while preserving local history, daily anchor, legacy key compatibility, and Supabase sync behavior.

**Architecture:** Create `assets/app/history-store.js` for pure helpers only: record normalization, history merge/dedupe/limit, timestamp comparison, row conversion, and storage key constants. Keep the actual localStorage adapter in `storage.js` and all Supabase auth/network requests in `sync.js`.

**Tech Stack:** Static ES modules, browser localStorage adapter, Supabase REST row mapping, Node `.mjs` tests, production browser smoke.

---

## Current Decision

Do this slice after `reading-client`, `result-renderer`, and `followup` are verified.

Do not redesign history UI, sync flow, auth session handling, share links, resonance, companion profile, entitlement, or usage summary in this slice. The only behavior change allowed is making previously private normalization/row-mapping helpers testable from a shared module.

## File Structure

- Create: `assets/app/history-store.js`
  - Exports `HISTORY_KEY`, `DAILY_ANCHOR_KEY`, `LEGACY_HISTORY_KEY`, `LEGACY_DAILY_ANCHOR_KEY`, and `HISTORY_LIMIT`.
  - Exports `normalizeHistory(records, { limit })`.
  - Exports `normalizeHistoryRecord(record)`.
  - Exports `mergeHistoryRecords(existingRecords, incomingRecords, { limit })`.
  - Exports `historyTimestamp(record)`.
  - Exports `historyRecordToRow(record)`.
  - Exports `historyRecordFromRow(row)`.
- Modify: `assets/app/storage.js`
  - Imports keys and pure helpers from `history-store.js`.
  - Keeps `createStorage()`, `todayKey()`, `loadHistory()`, `saveHistoryRecord()`, `mergeHistory()`, `clearHistory()`, `loadDailyAnchor()`, `saveDailyAnchor()`, and `clearDailyAnchors()`.
  - Uses `normalizeHistoryRecord()` for daily anchors.
- Modify: `assets/app/sync.js`
  - Imports `historyRecordToRow()` and `historyRecordFromRow()` from `history-store.js`.
  - Stops owning row conversion itself.
  - Keeps auth, session refresh, REST calls, function calls, and sync orchestration unchanged.
- Add: `tests/history-store.test.mjs`
  - Tests normalization, merge/dedupe/limit, legacy-compatible shape, row roundtrip, cards/followups/clarification/gua preservation, and invalid status/spread fallbacks.
- Modify only if needed: `tests/storage.test.mjs`, `tests/sync.test.mjs`
  - Should remain behavior tests for adapters and network orchestration.

---

## Current Status

- [x] Plan written.
- [x] Contract/unit tests added.
- [x] `history-store.js` implemented.
- [x] `storage.js` delegates normalization and merge helpers.
- [x] `sync.js` delegates row conversion helpers.
- [x] Full tests pass.
- [x] Production browser smoke confirms a live reading can still save and render history-dependent result actions.

Deployment note:

- `npx vercel deploy --prod --yes` deployed `dpl_qE3M72ECYcLu4Xe8nqh2WvS6PEVA` and aliased it to `https://askaura.vercel.app`.
- Production smoke at `https://askaura.vercel.app/index.html?pwsmoke=history-store-refactor` completed one live meihua reading. The `reading` function returned 200 with `[DONE]`, `#action-do`, `#action-dont`, and `#action-watch` rendered, `askaura.history.v1` contained one saved record, the share/action-status surfaces were visible, and 390px viewport had no horizontal overflow.

## Task 1: Unit Test First

**Files:**
- Add: `tests/history-store.test.mjs`

- [x] Test:
  - `normalizeHistoryRecord()` returns `null` for non-object input.
  - invalid `actionStatus` becomes `""`.
  - invalid `spreadType` becomes `"single"`.
  - empty/invalid follow-ups and cards are filtered.
  - `mergeHistoryRecords()` dedupes by id and keeps the newer `updatedAt`/`createdAt`.
  - `mergeHistoryRecords()` sorts newest first and enforces `HISTORY_LIMIT`.
  - `historyRecordToRow()` and `historyRecordFromRow()` preserve action status, review, favorite, spread, cards, gua, followups, clarification, anchor, language, and timestamps.

Run:

```powershell
node --experimental-vm-modules tests/history-store.test.mjs
```

Expected before implementation: FAIL because the module does not exist.

## Task 2: History Store Module

**Files:**
- Add: `assets/app/history-store.js`

- [x] Move pure normalization helpers from `storage.js` into this module:
  - `normalizeHistory()`
  - `normalizeRecord()` renamed to `normalizeHistoryRecord()`
  - `normalizeFollowups()`
  - `normalizeCards()`
  - `normalizeActionStatus()`
  - `normalizeSpreadType()`
  - `stringValue()`
  - `timestampOf()` renamed to `historyTimestamp()`
  - `cryptoId()`
- [x] Move row conversion helpers from `sync.js` into this module:
  - `historyRecordToRow()`
  - `historyRecordFromRow()`
- [x] Add `mergeHistoryRecords(existingRecords, incomingRecords, { limit })` so storage and sync use the same dedupe behavior.
- [x] Keep generated IDs and fallback timestamps equivalent to current behavior.

Run:

```powershell
node --experimental-vm-modules tests/history-store.test.mjs
```

Expected after implementation: PASS.

## Task 3: Storage Integration

**Files:**
- Modify: `assets/app/storage.js`

- [x] Import keys, `HISTORY_LIMIT`, `normalizeHistory`, `normalizeHistoryRecord`, and `mergeHistoryRecords`.
- [x] Remove local duplicate normalization helpers from `storage.js`.
- [x] Keep `createStorage()` behavior unchanged.
- [x] Keep legacy read compatibility:
  - read `rill.history.v1` only when `askaura.history.v1` is absent.
  - read `rill.dailyAnchors.v1` only when `askaura.dailyAnchors.v1` is absent.
  - never delete old `rill.*` keys during clear.
- [x] Keep writes only to `askaura.*` keys.

Run:

```powershell
node --experimental-vm-modules tests/history-store.test.mjs
node tests/storage.test.mjs
```

Expected: PASS.

## Task 4: Sync Integration

**Files:**
- Modify: `assets/app/sync.js`

- [x] Import `historyRecordToRow()` and `historyRecordFromRow()` from `history-store.js`.
- [x] Remove local duplicate row conversion exports.
- [x] Re-export imported row conversion helpers from `sync.js` so existing tests and external imports keep working.
- [x] Keep `syncHistory()` request order and REST paths unchanged.
- [x] Keep AskAura table names and never introduce old cijing/RiLL table refs.

Run:

```powershell
node tests/sync.test.mjs
node tests/askaura-migration-static.test.mjs
```

Expected: PASS.

## Task 5: Verification

Run:

```powershell
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true } }; if ($failed) { exit 1 }
```

Browser smoke:

- Production page loads.
- One meihua reading reaches `[DONE]`.
- `#action-do`, `#action-dont`, and `#action-watch` render.
- No horizontal overflow on 390px.

---

## Completion Criteria

- `storage.js` no longer owns private record normalization logic.
- `sync.js` no longer owns private row conversion logic.
- Local history limit, dedupe, daily anchors, and legacy key read compatibility remain unchanged.
- Cloud sync row roundtrip remains unchanged.
- No unrelated UI, auth, payment, or product behavior changes.
