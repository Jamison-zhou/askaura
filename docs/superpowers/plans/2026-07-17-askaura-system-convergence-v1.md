# AskAura System Convergence V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild AskAura around the complete observation → confirmed insight → action → optional echo → journey loop while preserving the established brand world and shipping the new system as one coordinated release.

**Architecture:** Keep the static HTML/CSS/ES-module stack, but move lifecycle, recommendation, safety, journey derivation, analytics, and view rendering into focused modules. Add an additive Supabase migration and a local-record compatibility layer so existing records remain readable as legacy archives. Build every subsystem behind `askaura.systemConvergenceV1`, verify each slice independently, then enable the flag only after the full browser and data-migration acceptance pass.

**Tech Stack:** Static HTML/CSS, native ES modules, Supabase Auth/REST/Edge Functions, SQL migrations with RLS, Node 24 `.mjs` tests, browser-harness acceptance checks.

---

## File Map

### Product state and domain logic

- Create `assets/app/observation-lifecycle.js`: record states, temporary expiry, action confirmation, echo state, legacy normalization.
- Create `assets/app/mode-recommender.js`: question-first mode recommendation without model authority.
- Create `assets/app/safety-router.js`: high-risk routing before ritual entry.
- Create `assets/app/journey-model.js`: adaptive-home priority, active-item limit, journey nodes and theme branches.
- Create `assets/app/product-events.js`: privacy-safe event names and local opt-out.
- Modify `assets/app/history-store.js`: preserve existing fields and serialize V1 lifecycle fields.
- Modify `assets/app/storage.js`: temporary-record cleanup and analytics preference.
- Modify `assets/app/sync.js`: V1 cloud row mapping, per-record deletion, cloud export, cloud purge.

### UI controllers and views

- Create `assets/app/views/home-view.js`: new, resume, echo-due and active-journey home states.
- Create `assets/app/views/observation-view.js`: question-first entry, recommendation and advanced settings.
- Create `assets/app/views/result-view.js`: layered result, insight selection and action confirmation.
- Create `assets/app/views/journey-view.js`: route map, active list, echo and legacy archive.
- Create `assets/app/views/settings-view.js`: appearance, language, motion, privacy and data controls.
- Create `assets/app/controllers/observation-controller.js`: ritual and reading orchestration.
- Create `assets/app/controllers/journey-controller.js`: action, echo, theme and lifecycle mutations.
- Modify `index.html`: replace inline feature ownership with mount points and controllers.
- Modify `styles.css`: stable base components and accessibility states.
- Modify `theme-observation.css`: brand-specific scenes, route-map visuals and responsive enhancement.

### Backend and operations

- Create `supabase/migrations/202607170001_askaura_system_convergence_v1.sql`: additive journey fields and privacy-safe product events.
- Create `supabase/functions/_shared/prompts/dual.ts`: one combined dual prompt.
- Create `supabase/functions/_shared/safety-router.ts`: server-owned high-risk routing before provider calls.
- Modify `supabase/functions/_shared/types.ts`: combined dual request and V1 event types.
- Modify `supabase/functions/_shared/model-router.ts`: preserve server-owned route, remove ineffective model-name configuration.
- Modify `supabase/functions/reading/index.ts`: combined dual mode, high-risk rejection contract and fixed Chinese intent handling.
- Create `supabase/functions/account-data/index.ts`: authenticated account deletion with service-role ownership.
- Create `supabase/functions/product-event/index.ts`: allowlisted anonymous or authenticated product-event ingestion.
- Modify `supabase/functions/admin-config/index.ts`: sanitize only effective controls.
- Modify `admin.html`: lean operations console.

### Tests and release

- Create `tests/observation-lifecycle.test.mjs`.
- Create `tests/mode-recommender.test.mjs`.
- Create `tests/safety-router.test.mjs`.
- Create `tests/journey-model.test.mjs`.
- Create `tests/product-events.test.mjs`.
- Create `tests/account-data-contract.test.mjs`.
- Create `tests/system-convergence-contract.test.mjs`.
- Create `tests/system-convergence-migration.test.mjs`.
- Create `tests/system-convergence-browser-smoke.mjs`.
- Modify `README.md`: pin Node 24 and document one full test command.
- Modify `docs/ask-aura-implementation-plans/00-index.md`: mark System Convergence V1 active and Phase 8B still blocked.

---

## Task 1: Pin The Runtime And Add The Release Flag

**Files:**
- Create: `.node-version`
- Create: `assets/app/feature-flags.js`
- Create: `tests/system-convergence-contract.test.mjs`
- Modify: `index.html:1-40`
- Modify: `README.md:15-40`

- [ ] **Step 1: Write the failing contract test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const flags = await readFile("assets/app/feature-flags.js", "utf8");
const html = await readFile("index.html", "utf8");
const nodeVersion = (await readFile(".node-version", "utf8")).trim();

assert.equal(nodeVersion, "24");
assert.match(flags, /systemConvergenceV1/);
assert.match(flags, /askaura\.systemConvergenceV1/);
assert.match(html, /feature-flags\.js/);
console.log("system convergence release flag contract passed");
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
node tests/system-convergence-contract.test.mjs
```

Expected: FAIL because `.node-version` and `assets/app/feature-flags.js` do not exist.

- [ ] **Step 3: Add the runtime and flag module**

`.node-version`:

```text
24
```

`assets/app/feature-flags.js`:

```js
const STORAGE_KEY = "askaura.systemConvergenceV1";

export function systemConvergenceEnabled(storage = globalThis.localStorage) {
  const override = storage?.getItem?.(STORAGE_KEY);
  if (override === "enabled") return true;
  if (override === "disabled") return false;
  return false;
}

export function setSystemConvergenceEnabled(enabled, storage = globalThis.localStorage) {
  storage?.setItem?.(STORAGE_KEY, enabled ? "enabled" : "disabled");
}
```

Import the module from `index.html` and set `document.documentElement.dataset.systemVersion` to `v1` or `legacy` before mounting the application.

- [ ] **Step 4: Document the full runtime command**

Add this README baseline:

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

- [ ] **Step 5: Verify and commit**

Run: `node tests/system-convergence-contract.test.mjs`

Expected: `system convergence release flag contract passed`.

Commit:

```powershell
git add .node-version assets/app/feature-flags.js tests/system-convergence-contract.test.mjs index.html README.md
git commit -m "chore: establish system convergence release gate"
```

## Task 2: Add The Journey Data Schema

**Files:**
- Create: `supabase/migrations/202607170001_askaura_system_convergence_v1.sql`
- Create: `tests/system-convergence-migration.test.mjs`

- [ ] **Step 1: Write the failing migration contract**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile("supabase/migrations/202607170001_askaura_system_convergence_v1.sql", "utf8");
for (const column of [
  "lifecycle_state", "selected_insight", "action_theme", "echo_due_at",
  "echo_status", "echo_note", "temporary_expires_at", "source_version"
]) assert.match(sql, new RegExp(column));
assert.match(sql, /askaura_product_events/);
assert.match(sql, /enable row level security/);
assert.doesNotMatch(sql, /question\s+text|answer\s+text|action_text\s+text|echo_note\s+text/i);
console.log("system convergence migration contract passed");
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node tests/system-convergence-migration.test.mjs`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Add the additive migration**

```sql
alter table public.askaura_reflection_records
  add column if not exists lifecycle_state text not null default 'legacy'
    check (lifecycle_state in ('temporary', 'saved', 'active', 'paused', 'closed', 'legacy')),
  add column if not exists selected_insight text not null default '',
  add column if not exists action_theme text not null default '',
  add column if not exists echo_due_at timestamptz,
  add column if not exists echo_status text not null default ''
    check (echo_status in ('', 'changed', 'unchanged', 'not_done', 'passed')),
  add column if not exists echo_note text not null default '',
  add column if not exists temporary_expires_at timestamptz,
  add column if not exists source_version text not null default 'legacy';

create index if not exists askaura_records_journey_idx
  on public.askaura_reflection_records (user_id, lifecycle_state, updated_at desc);

create table if not exists public.askaura_product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text not null default '',
  event_name text not null check (event_name in (
    'observation_started', 'observation_completed', 'insight_confirmed',
    'action_confirmed', 'echo_recorded', 'journey_reopened',
    'temporary_expired', 'flow_failed'
  )),
  mode text not null default '',
  lifecycle_state text not null default '',
  duration_bucket text not null default '',
  error_code text not null default '',
  created_at timestamptz not null default now()
);

alter table public.askaura_product_events enable row level security;

create policy "askaura_events_select_own"
  on public.askaura_product_events for select
  using (auth.uid() = user_id);
```

Do not add a browser insert policy. `product-event` validates the allowlist and writes with the service role so arbitrary clients cannot add raw fields or unsupported event names.

- [ ] **Step 4: Verify and commit**

Run: `node tests/system-convergence-migration.test.mjs`

Expected: `system convergence migration contract passed`.

Commit:

```powershell
git add supabase/migrations/202607170001_askaura_system_convergence_v1.sql tests/system-convergence-migration.test.mjs
git commit -m "feat: add journey lifecycle schema"
```

## Task 3: Implement Observation Lifecycle And Legacy Compatibility

**Files:**
- Create: `assets/app/observation-lifecycle.js`
- Create: `tests/observation-lifecycle.test.mjs`
- Modify: `assets/app/history-store.js:31-117`
- Modify: `assets/app/storage.js:51-91`

- [ ] **Step 1: Write lifecycle tests**

```js
import assert from "node:assert/strict";
import {
  createTemporaryObservation, confirmAction, saveObservation,
  recordEcho, isTemporaryExpired, normalizeLifecycle
} from "../assets/app/observation-lifecycle.js";

const now = new Date("2026-07-17T00:00:00.000Z");
const temporary = createTemporaryObservation({ id: "r1", mode: "tarot" }, now);
assert.equal(temporary.lifecycleState, "temporary");
assert.equal(temporary.temporaryExpiresAt, "2026-07-24T00:00:00.000Z");
assert.equal(isTemporaryExpired(temporary, new Date("2026-07-25T00:00:00.000Z")), true);

const active = confirmAction(temporary, {
  selectedInsight: "先降低沟通噪音",
  action: "明晚只讨论一件具体的事",
  actionTheme: "沟通边界",
  echoDueAt: "2026-07-20T00:00:00.000Z"
}, now);
assert.equal(active.lifecycleState, "active");
assert.equal(active.temporaryExpiresAt, "");

assert.equal(saveObservation(temporary, now).lifecycleState, "saved");
assert.equal(recordEcho(active, { status: "changed", note: "有一点变化" }, now).echoStatus, "changed");
assert.equal(normalizeLifecycle({ id: "old" }).lifecycleState, "legacy");
console.log("observation lifecycle tests passed");
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/observation-lifecycle.test.mjs`

Expected: FAIL because the lifecycle module does not exist.

- [ ] **Step 3: Implement the pure lifecycle module**

```js
const STATES = new Set(["temporary", "saved", "active", "paused", "closed", "legacy"]);
const ECHOES = new Set(["", "changed", "unchanged", "not_done", "passed"]);

export function normalizeLifecycle(record = {}) {
  return {
    ...record,
    lifecycleState: STATES.has(record.lifecycleState) ? record.lifecycleState : "legacy",
    selectedInsight: text(record.selectedInsight),
    actionTheme: text(record.actionTheme),
    echoDueAt: text(record.echoDueAt),
    echoStatus: ECHOES.has(record.echoStatus) ? record.echoStatus : "",
    echoNote: text(record.echoNote),
    temporaryExpiresAt: text(record.temporaryExpiresAt),
    sourceVersion: text(record.sourceVersion) || "legacy",
  };
}

export function createTemporaryObservation(record, now = new Date()) {
  return normalizeLifecycle({
    ...record,
    lifecycleState: "temporary",
    temporaryExpiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    sourceVersion: "system-convergence-v1",
    updatedAt: now.toISOString(),
  });
}

export function saveObservation(record, now = new Date()) {
  return normalizeLifecycle({ ...record, lifecycleState: "saved", temporaryExpiresAt: "", updatedAt: now.toISOString() });
}

export function confirmAction(record, values, now = new Date()) {
  return normalizeLifecycle({
    ...record, ...values, lifecycleState: "active", temporaryExpiresAt: "", updatedAt: now.toISOString()
  });
}

export function recordEcho(record, { status, note = "" }, now = new Date()) {
  return normalizeLifecycle({ ...record, echoStatus: status, echoNote: note, updatedAt: now.toISOString() });
}

export function isTemporaryExpired(record, now = new Date()) {
  return record.lifecycleState === "temporary" && Date.parse(record.temporaryExpiresAt) <= now.getTime();
}

function text(value) { return typeof value === "string" ? value.trim() : ""; }
```

- [ ] **Step 4: Extend row normalization and storage cleanup**

Add lifecycle fields to `normalizeHistoryRecord()`, `historyRecordToRow()` and `historyRecordFromRow()`. Add `cleanupExpiredTemporaryRecords(store, now)` in `storage.js` that keeps every non-temporary record and every unexpired temporary record.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node tests/observation-lifecycle.test.mjs
node tests/history-store.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

Expected: all PASS.

Commit:

```powershell
git add assets/app/observation-lifecycle.js assets/app/history-store.js assets/app/storage.js tests/observation-lifecycle.test.mjs
git commit -m "feat: add observation lifecycle and legacy archive"
```

## Task 4: Add Question-First Recommendation And Safety Routing

**Files:**
- Create: `assets/app/mode-recommender.js`
- Create: `assets/app/safety-router.js`
- Create: `supabase/functions/_shared/safety-router.ts`
- Create: `tests/mode-recommender.test.mjs`
- Create: `tests/safety-router.test.mjs`

- [ ] **Step 1: Write recommendation and safety tests**

```js
import assert from "node:assert/strict";
import { recommendMode } from "../assets/app/mode-recommender.js";
import { routeQuestionSafety } from "../assets/app/safety-router.js";

assert.equal(recommendMode("我现在应该推进还是再等一等").mode, "meihua");
assert.equal(recommendMode("这段关系里我为什么总是不敢表达").mode, "tarot");
assert.equal(recommendMode("我想从情绪和时机两个角度一起看").mode, "dual");
assert.equal(recommendMode("我最近有点乱").mode, "tarot");

assert.equal(routeQuestionSafety("我想伤害自己").route, "support");
assert.equal(routeQuestionSafety("这份合同一定能赢吗").route, "professional-boundary");
assert.equal(routeQuestionSafety("我该不该和同事谈谈").route, "observe");
console.log("mode recommendation and safety tests passed");
```

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
node tests/mode-recommender.test.mjs
node tests/safety-router.test.mjs
```

Expected: both FAIL because the modules do not exist.

- [ ] **Step 3: Implement deterministic, explainable routing**

`mode-recommender.js` must return `{ mode, reasonKey, confidence }`, use small reviewed keyword groups, default to tarot, and never claim correctness.

`safety-router.js` must return one of:

```js
{ route: "observe", reason: "" }
{ route: "professional-boundary", reason: "medical|legal|financial" }
{ route: "support", reason: "self-harm|violence" }
```

Use normalized lowercase matching for Chinese and English terms. Do not store or emit the original question from this module.

Add the same reviewed high-risk categories to `_shared/safety-router.ts`. Call it in `reading/index.ts` before `recordUsageEvent()` and before provider creation. Return HTTP `422` with `{ error: "professional_boundary" }` or `{ error: "immediate_support" }`; do not write the raw question to usage or quality metadata.

- [ ] **Step 4: Verify and commit**

Run the two tests again.

Expected: both PASS.

Commit:

```powershell
git add assets/app/mode-recommender.js assets/app/safety-router.js supabase/functions/_shared/safety-router.ts supabase/functions/reading/index.ts tests/mode-recommender.test.mjs tests/safety-router.test.mjs
git commit -m "feat: route questions by intent and safety"
```

## Task 5: Build Adaptive Home And Journey Derivation

**Files:**
- Create: `assets/app/journey-model.js`
- Create: `assets/app/views/home-view.js`
- Create: `tests/journey-model.test.mjs`
- Modify: `index.html:40-238`

- [ ] **Step 1: Write journey priority tests**

```js
import assert from "node:assert/strict";
import { deriveHomeState, deriveJourney } from "../assets/app/journey-model.js";

const now = new Date("2026-07-17T12:00:00.000Z");
assert.equal(deriveHomeState([], now).kind, "new-user");
assert.equal(deriveHomeState([{ id: "t", lifecycleState: "temporary", updatedAt: now.toISOString() }], now).kind, "resume");
assert.equal(deriveHomeState([{ id: "a", lifecycleState: "active", echoDueAt: "2026-07-16T12:00:00.000Z" }], now).kind, "echo-due");

const journey = deriveJourney([
  { id: "a", lifecycleState: "active", actionTheme: "沟通边界" },
  { id: "b", lifecycleState: "closed", actionTheme: "沟通边界", echoStatus: "changed" },
  { id: "c", lifecycleState: "legacy" }
]);
assert.equal(journey.active.length, 1);
assert.equal(journey.legacy.length, 1);
assert.equal(journey.themes[0].count, 2);
assert.deepEqual(journey.activeLimit, { count: 1, limit: 3, reached: false });
console.log("journey model tests passed");
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/journey-model.test.mjs`

Expected: FAIL because `journey-model.js` does not exist.

- [ ] **Step 3: Implement pure home and journey derivation**

Priority order must be:

```text
echo-due > resume > active > returning > new-user
```

`deriveJourney(records)` must return `{ active, paused, closed, saved, temporary, legacy, themes, activeLimit }`, sort active items by `echoDueAt`, build themes only from non-empty user-confirmed `actionTheme` values, and return `{ count, limit: 3, reached }` without blocking temporary observations.

- [ ] **Step 4: Implement the home view**

`home-view.js` exports `renderHome(container, state, labels)` and emits only semantic buttons with these actions:

```html
<button data-home-action="start">开始一次观察</button>
<button data-home-action="resume" data-record-id="...">继续上次观察</button>
<button data-home-action="echo" data-record-id="...">说说后来怎么样了</button>
<button data-home-action="journey">查看我的旅程</button>
```

Replace the fixed compose-first opening in `index.html` with `<section id="adaptive-home"></section>` while preserving the current brand scene behind the mount point.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node tests/journey-model.test.mjs
node tests/index-display-contract.test.mjs
node tests/observation-theme-contract.test.mjs
```

Expected: all PASS after updating display-contract expectations to the adaptive mount.

Commit:

```powershell
git add assets/app/journey-model.js assets/app/views/home-view.js tests/journey-model.test.mjs index.html tests/index-display-contract.test.mjs
git commit -m "feat: add adaptive home and journey priority"
```

## Task 6: Rebuild The New Observation Entry

**Files:**
- Create: `assets/app/views/observation-view.js`
- Create: `assets/app/controllers/observation-controller.js`
- Modify: `index.html:1200-1780`
- Modify: `assets/app/ritual-engine.js`
- Modify: `tests/entry-ritual-contract.test.mjs`

- [ ] **Step 1: Update the entry contract first**

Assert the rendered entry contains, in order:

```text
question input → recommendation → mode override → advanced settings → ritual action
```

Assert there is no visible daily-mode control and that tarot defaults to `single`, meihua defaults to `time`, and dual copy includes “不代表更准确”.

- [ ] **Step 2: Run and verify failure**

Run: `node tests/entry-ritual-contract.test.mjs`

Expected: FAIL because the current mode selector appears before question-first recommendation.

- [ ] **Step 3: Implement the entry view contract**

`observation-view.js` exports:

```js
export function renderObservationEntry(container, {
  question = "", recommendation, selectedMode = "tarot",
  advancedOpen = false, language = "zh"
}) { /* returns and mounts the complete entry markup */ }
```

The view emits `observation:question`, `observation:mode`, `observation:advanced` and `observation:start` custom events. It does not call network or storage APIs.

- [ ] **Step 4: Move orchestration into the controller**

`observation-controller.js` owns question assist, safety routing, ritual selection, loading and reading-client calls. It must return explicit states:

```js
{ status: "completed", record }
{ status: "cancelled" }
{ status: "support", reason }
{ status: "failed", errorCode, resumable: true }
```

Remove the four corrupted `"鐪嬫竻"` strings and use the UTF-8 constant `"看清"`.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node tests/entry-ritual-contract.test.mjs
node tests/ritual-engine.test.mjs
node tests/clarify-contract.test.mjs
node --experimental-vm-modules tests/index-syntax.test.mjs
```

Expected: all PASS and `rg -n "鐪嬫竻|data-mode=\"daily\"|setMode\(\"daily\"" index.html assets` returns no active UI match.

Commit:

```powershell
git add assets/app/views/observation-view.js assets/app/controllers/observation-controller.js assets/app/ritual-engine.js index.html tests/entry-ritual-contract.test.mjs
git commit -m "feat: rebuild question-first observation entry"
```

## Task 7: Replace Sequential Dual Reading With One Combined Request

**Files:**
- Create: `supabase/functions/_shared/prompts/dual.ts`
- Modify: `supabase/functions/_shared/types.ts`
- Modify: `supabase/functions/_shared/model-router.ts`
- Modify: `supabase/functions/reading/index.ts`
- Modify: `assets/app/controllers/observation-controller.js`
- Create: `tests/dual-reading-contract.test.mjs`

- [ ] **Step 1: Write a failing combined-request test**

The test must assert:

```js
assert.match(types, /mode:\s*"dual-reading"/);
assert.match(reading, /case\s+"dual-reading"/);
assert.match(dualPrompt, /\[SUMMARY\]/);
assert.match(dualPrompt, /\[TAROT_EVIDENCE\]/);
assert.match(dualPrompt, /\[GUA_EVIDENCE\]/);
assert.match(dualPrompt, /\[ACTION\]/);
assert.doesNotMatch(controller, /await streamReading[\s\S]+await streamReading/);
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/dual-reading-contract.test.mjs`

Expected: FAIL because dual currently makes two sequential requests.

- [ ] **Step 3: Add the combined request and prompt**

Define the request shape:

```ts
export type DualReadingRequest = BaseReadingRequest & {
  mode: "dual-reading";
  entry: "dual";
  question: string;
  cards: ReadingCard[];
  guaName: string;
  intent: string;
};
```

The prompt must require `[SUMMARY]`, `[TAROT_EVIDENCE]`, `[GUA_EVIDENCE]`, `[AVOID]`, `[WATCH]`, and `[ACTION]`, and state that two sources do not mean greater certainty.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
node tests/dual-reading-contract.test.mjs
node tests/phase1-5-model-router.test.mjs
node tests/phase1-5-prompt-cache.test.mjs
```

Expected: all PASS.

Commit:

```powershell
git add supabase/functions/_shared/prompts/dual.ts supabase/functions/_shared/types.ts supabase/functions/_shared/model-router.ts supabase/functions/reading/index.ts assets/app/controllers/observation-controller.js tests/dual-reading-contract.test.mjs
git commit -m "feat: generate dual observation in one request"
```

## Task 8: Build Layered Results, Insight Confirmation And Action Entry

**Files:**
- Create: `assets/app/views/result-view.js`
- Create: `assets/app/controllers/journey-controller.js`
- Modify: `assets/app/result-renderer.js`
- Modify: `index.html:239-454`
- Create: `tests/result-confirmation-contract.test.mjs`

- [ ] **Step 1: Write the failing result contract**

Assert the view exposes these actions and no active save button after auto-creating a temporary record:

```text
confirm-insight
accept-action
edit-action
save-observation
leave-temporary
expand-evidence
```

Assert `confirm-insight` is required before `accept-action`, and the complete AI text is inside a collapsed evidence region.

- [ ] **Step 2: Run and verify failure**

Run: `node tests/result-confirmation-contract.test.mjs`

Expected: FAIL because current results immediately save and expose “保存到回看”.

- [ ] **Step 3: Implement the result state machine**

Use these states:

```js
const RESULT_STEPS = ["summary", "insight-confirmed", "action-confirmed"];
```

The controller must create a temporary record on successful generation, update it with `selectedInsight`, then call `confirmAction()` only after the user accepts or edits the action. Theme suggestions remain editable and are not persisted until action confirmation.

- [ ] **Step 4: Fix failure actions**

On `{ status: "failed" }`, render only:

```html
<button data-failure-action="retry">重新生成</button>
<button data-failure-action="later">稍后继续</button>
<button data-failure-action="save-symbol">只保存问题与象</button>
<button data-failure-action="edit-question">修改问题</button>
```

Keep copy, PDF, image, private link, action confirmation and resonance controls disabled.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node tests/result-confirmation-contract.test.mjs
node tests/result-renderer.test.mjs
node tests/share-text.test.mjs
node tests/share-image-layout.test.mjs
```

Expected: all PASS.

Commit:

```powershell
git add assets/app/views/result-view.js assets/app/controllers/journey-controller.js assets/app/result-renderer.js index.html tests/result-confirmation-contract.test.mjs
git commit -m "feat: require user-confirmed insight and action"
```

## Task 9: Build Echo And The Journey Workspace

**Files:**
- Create: `assets/app/views/journey-view.js`
- Modify: `assets/app/controllers/journey-controller.js`
- Modify: `index.html:455-560`
- Modify: `assets/app/companion.js`
- Create: `tests/journey-view-contract.test.mjs`

- [ ] **Step 1: Write the failing journey-view contract**

Assert the journey view has sections for active, recent echoes, confirmed themes, all saved records and legacy archive. Assert the primary echo choices are exactly `changed`, `unchanged`, `not_done`, and `passed`.

- [ ] **Step 2: Run and verify failure**

Run: `node tests/journey-view-contract.test.mjs`

Expected: FAIL because history and companion are separate side panels.

- [ ] **Step 3: Implement map and management layers**

Render a route-map SVG from derived nodes only:

```js
[{ id, x, y, state: "active|echoed|closed", theme }]
```

Render list controls with `data-journey-action="echo|pause|resume|close|edit"`. Do not put raw questions or answers into SVG attributes, analytics payloads or theme summaries.

- [ ] **Step 4: Replace review language with echo language**

Remove front-stage `复盘`, `review`, `完成任务` labels. Use `回声`, `后来怎么样了`, `有一点变化`, `没什么变化`, `我没有去做`, `这件事已经过去了`.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node tests/journey-view-contract.test.mjs
node tests/phase3-retention-contract.test.mjs
node tests/phase7-companion-contract.test.mjs
```

Expected: all PASS after updating the completed-phase contracts to the new journey terminology.

Commit:

```powershell
git add assets/app/views/journey-view.js assets/app/controllers/journey-controller.js assets/app/companion.js index.html tests/journey-view-contract.test.mjs tests/phase3-retention-contract.test.mjs tests/phase7-companion-contract.test.mjs
git commit -m "feat: unify history and companion into journey"
```

## Task 10: Rebuild Account, Privacy And Data Controls

**Files:**
- Create: `assets/app/views/settings-view.js`
- Modify: `assets/app/sync.js`
- Modify: `assets/app/storage.js`
- Modify: `index.html:503-560`
- Create: `supabase/functions/account-data/index.ts`
- Create: `tests/privacy-controls-contract.test.mjs`
- Create: `tests/account-data-contract.test.mjs`

- [ ] **Step 1: Write the privacy contract**

Assert the settings view labels local/cloud state, AI processing, analytics preference, export, local purge, cloud purge and account deletion. Assert the homepage copy contains “默认保存在本机” and “发送给 AI 服务处理”, and no longer contains “仅对你可见”.

- [ ] **Step 2: Run and verify failure**

Run: `node tests/privacy-controls-contract.test.mjs`

Expected: FAIL because current privacy copy is absolute and data controls are incomplete.

- [ ] **Step 3: Add explicit data APIs**

Extend `sync.js` with:

```js
exportData()
deleteRecord(recordId)
clearCloudRecords()
deleteAccount()
```

`exportData()` returns a JSON object with `version`, `exportedAt`, `records`, `dailyAnchors: []`, and `settings`, never session tokens. `deleteAccount()` must call a dedicated authenticated Edge Function; do not expose service-role deletion to the browser.

Implement `account-data` with only `POST { action: "delete-account" }`. Resolve the user from the bearer token, reject anonymous requests with `401`, delete the authenticated user through the Supabase Admin API with the service role, and return `{ ok: true }`. The contract test must reject a handler that accepts a browser-provided user id.

- [ ] **Step 4: Move theme and language controls into settings**

Keep `night`, `light`, and `mono`. Show English under “实验性语言”. Keep `zh` as default and persist the user choice.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node tests/privacy-controls-contract.test.mjs
node tests/account-data-contract.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
node tests/security-headers.test.mjs
```

Expected: all PASS.

Commit:

```powershell
git add assets/app/views/settings-view.js assets/app/sync.js assets/app/storage.js index.html supabase/functions/account-data/index.ts tests/privacy-controls-contract.test.mjs tests/account-data-contract.test.mjs
git commit -m "feat: add transparent privacy and data controls"
```

## Task 11: Move Sharing And Anonymous Resonance Behind The New Loop

**Files:**
- Modify: `index.html:375-454`
- Modify: `assets/app/share-text.js`
- Modify: `supabase/functions/resonance-pool/index.ts`
- Modify: `tests/phase5-sharing-export-contract.test.mjs`
- Modify: `tests/phase6-resonance-pool-contract.test.mjs`

- [ ] **Step 1: Update contracts first**

Sharing contracts must assert default question exclusion and secondary placement under `带走这次观察`. Resonance contracts must assert submission requires a formal record with a non-empty `echo_status` and stores only confirmed theme, confirmed action and echo status.

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
node tests/phase5-sharing-export-contract.test.mjs
node tests/phase6-resonance-pool-contract.test.mjs
```

Expected: resonance contract FAILS because current submission is available before echo.

- [ ] **Step 3: Enforce the new boundary**

Reject resonance submission unless:

```ts
record.lifecycleState !== "temporary" &&
record.actionTheme.length > 0 &&
record.action.length > 0 &&
record.echoStatus.length > 0
```

Return `409 { error: "echo_required" }` when the record is not eligible. Keep raw question, full answer, echo note, email and user id out of public responses.

- [ ] **Step 4: Verify and commit**

Run both contracts again.

Expected: both PASS.

Commit:

```powershell
git add index.html assets/app/share-text.js supabase/functions/resonance-pool/index.ts tests/phase5-sharing-export-contract.test.mjs tests/phase6-resonance-pool-contract.test.mjs
git commit -m "feat: place sharing and resonance after reflection loop"
```

## Task 12: Add Privacy-Safe Product Events

**Files:**
- Create: `assets/app/product-events.js`
- Create: `supabase/functions/product-event/index.ts`
- Create: `tests/product-events.test.mjs`
- Modify: `assets/app/controllers/observation-controller.js`
- Modify: `assets/app/controllers/journey-controller.js`
- Modify: `assets/app/sync.js`

- [ ] **Step 1: Write the failing event privacy test**

```js
import assert from "node:assert/strict";
import { sanitizeProductEvent } from "../assets/app/product-events.js";

const event = sanitizeProductEvent("action_confirmed", {
  mode: "tarot", lifecycleState: "active", question: "private",
  answer: "private", action: "private", note: "private", durationMs: 4200
});
assert.deepEqual(event, {
  eventName: "action_confirmed",
  mode: "tarot",
  lifecycleState: "active",
  durationBucket: "3-10s",
  errorCode: ""
});
console.log("product event privacy tests passed");
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/product-events.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the allowlist sanitizer and opt-out**

Only accept the event names defined in the migration. Only emit `eventName`, `mode`, `lifecycleState`, `durationBucket`, and `errorCode`. Read opt-out from `askaura.analytics.disabled.v1`; when disabled, return without network calls.

Implement `product-event` as a `--no-verify-jwt` Edge Function that optionally resolves the authenticated user, creates or accepts a bounded anonymous id, discards every non-allowlisted key, validates enum lengths, and inserts with the service role. The browser never writes directly to `askaura_product_events`.

- [ ] **Step 4: Verify and commit**

Run: `node tests/product-events.test.mjs`

Expected: PASS.

Commit:

```powershell
git add assets/app/product-events.js assets/app/controllers/observation-controller.js assets/app/controllers/journey-controller.js assets/app/sync.js supabase/functions/product-event/index.ts tests/product-events.test.mjs
git commit -m "feat: add privacy-safe journey metrics"
```

## Task 13: Converge The Operations Console

**Files:**
- Modify: `admin.html:150-430`
- Modify: `supabase/functions/admin-config/index.ts`
- Modify: `supabase/functions/_shared/model-router.ts`
- Create: `tests/admin-convergence-contract.test.mjs`

- [ ] **Step 1: Write the admin contract**

Assert admin exposes service health, prompt version, quality logging, safety scanning, feature flag, rollback note, usage, failure rate and latency buckets. Assert it does not expose editable `llm.provider`, `llm.model`, `models.basic.model`, `models.pro.model`, or live payment quota fields while paid UI is disabled.

- [ ] **Step 2: Run and verify failure**

Run: `node tests/admin-convergence-contract.test.mjs`

Expected: FAIL because ineffective provider/model fields are still editable.

- [ ] **Step 3: Remove ineffective controls and expose effective status**

Return a read-only route status object:

```json
{
  "provider": "deepseek",
  "basicModel": "deepseek-v4-flash",
  "proModel": "deepseek-v4-pro",
  "proEnabled": false
}
```

Keep editable controls only for base URL, API key, temperature, token caps, thinking gate, prompt version, safety/quality flags, convergence release flag and rollback note.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
node tests/admin-convergence-contract.test.mjs
node tests/config.test.mjs
node tests/phase1-5-model-router.test.mjs
node tests/phase9-ops-quality-contract.test.mjs
```

Expected: all PASS.

Commit:

```powershell
git add admin.html supabase/functions/admin-config/index.ts supabase/functions/_shared/model-router.ts tests/admin-convergence-contract.test.mjs
git commit -m "refactor: converge operations console controls"
```

## Task 14: Consolidate Visual States And Performance

**Files:**
- Modify: `styles.css`
- Modify: `theme-observation.css`
- Modify: `assets/app/ritual-engine.js`
- Modify: `tests/phase1-mobile-css.test.mjs`
- Modify: `tests/observation-theme-contract.test.mjs`

- [ ] **Step 1: Add failing visual-state contracts**

Assert styles cover:

```text
home-new, home-resume, home-echo, observation-entry, result-summary,
result-evidence, journey-map, journey-list, settings, failure, support,
reduced-motion, night, light, mono, mobile 390, desktop 1440
```

Assert the old `askaura-frosted-mirror-back.png` reference is absent and Google font CSS is not required for first render.

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
node tests/phase1-mobile-css.test.mjs
node tests/observation-theme-contract.test.mjs
```

Expected: FAIL until new state selectors and asset rules exist.

- [ ] **Step 3: Consolidate CSS ownership**

Keep structure, spacing, controls, focus, disabled and reduced-motion rules in `styles.css`. Keep backgrounds, textures, brand colors, map paths, card-back treatment and desktop scenic enhancement in `theme-observation.css`. Remove duplicate selectors after verifying computed styles at 390×844 and 1440×900.

- [ ] **Step 4: Reduce ritual cost**

Render only visible fan cards plus a small overscan window, lazy-load face images after selection, stop inactive animations, and use the flat observation-gate WebP card back. Keep full first-use timing and short returning-user timing as separate controller options.

- [ ] **Step 5: Verify and commit**

Run both tests and capture desktop/mobile screenshots for new user, echo due, result, journey and settings.

Expected: no horizontal overflow, no broken images, no long task over 100 ms during initial home render, and no missing focus indicator.

Commit:

```powershell
git add styles.css theme-observation.css assets/app/ritual-engine.js tests/phase1-mobile-css.test.mjs tests/observation-theme-contract.test.mjs
git commit -m "perf: consolidate visual states and ritual cost"
```

## Task 15: Full Migration, Browser Acceptance And One-Time Cutover

**Files:**
- Create: `tests/system-convergence-browser-smoke.mjs`
- Modify: `docs/ask-aura-implementation-plans/20-pre-release-smoke-checklist.md`
- Modify: `docs/ask-aura-implementation-plans/00-index.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add browser acceptance scenarios**

Automate or manually verify with browser-harness:

```text
1. New user → tarot recommendation → ritual → result → insight → action → local journey.
2. Returning user → adaptive active state → echo → route node closes.
3. Three active actions → soft limit message → new observation can remain temporary.
4. Meihua default time cast and advanced cast methods.
5. Dual one-request flow with “not more accurate” copy.
6. AI failure preserves question and symbols while result actions remain disabled.
7. High-risk question opens support state without ritual.
8. Legacy records appear only in legacy archive.
9. Login prompt appears after first action, local use remains available.
10. Night/light/mono and reduced-motion work on 390×844 and 1440×900.
11. Share excludes question by default; resonance requires an echo.
12. Local export, local purge and signed-in cloud purge are explicit and scoped.
```

- [ ] **Step 2: Run the entire local suite**

Run the Node 24 command documented in README.

Expected: every `*.test.mjs` exits 0. `release-smoke-authenticated.test.mjs` helper tests do not count as a live authenticated smoke.

- [ ] **Step 3: Run safe local browser acceptance**

Run:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

Open `http://127.0.0.1:5174/index.html`, enable the local convergence flag, and complete all non-mutating scenarios. Record screenshots and console/network failures in a dated smoke report.

- [ ] **Step 4: Run authenticated preview smoke only with local environment credentials**

Run: `node tests/release-smoke-authenticated.mjs`

Expected: admin login/config read, signed-in record round trip, private-link create/revoke, resonance submit/revoke, product-event allowlist rejection/acceptance, account-data unauthorized rejection, and cloud purge smoke pass against the dedicated AskAura project. Never print credentials. Do not run destructive account deletion against the reusable smoke account; use a disposable account when that specific flow is verified.

- [ ] **Step 5: Verify rollback before enabling by default**

Set `askaura.systemConvergenceV1=disabled`, reload, and confirm the legacy interface still reads existing records. Set it to `enabled`, reload, and confirm the V1 interface reads the same records as legacy archives.

- [ ] **Step 6: Update status and commit**

Only after every check passes:

- mark System Convergence V1 `Complete` in `00-index.md`;
- preserve Phase 8B as `Blocked`;
- add release and rollback notes to `CHANGELOG.md`;
- change the default flag to enabled.

Commit:

```powershell
git add tests/system-convergence-browser-smoke.mjs docs/ask-aura-implementation-plans/20-pre-release-smoke-checklist.md docs/ask-aura-implementation-plans/00-index.md CHANGELOG.md assets/app/feature-flags.js
git commit -m "release: enable AskAura system convergence v1"
```

---

## Self-Review Checklist

- [ ] Every requirement in `docs/askaura-system-convergence-v1-spec.md` maps to at least one task above.
- [ ] No task activates checkout, payment copy or provider-specific payment behavior.
- [ ] Old records remain readable and are never auto-profiled.
- [ ] Temporary records expire without deleting saved, active, paused, closed or legacy records.
- [ ] Product events cannot carry question, answer, action text or echo note.
- [ ] Result failure cannot enable successful-result actions.
- [ ] Mobile core flows and desktop enhancement use the same domain state.
- [ ] The release flag provides a verified rollback before default enablement.
- [ ] Real authenticated smoke is distinguished from local helper tests.
