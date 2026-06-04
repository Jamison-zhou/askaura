# Engineering Refactor Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans before each refactor slice. Do not perform a broad refactor without a feature or risk driver.

**Goal:** Reduce long-term maintenance risk without destabilizing migration or public beta.

**Architecture:** Refactor by feature seam. Each extraction must preserve existing behavior and include tests before further feature work depends on it.

**Tech Stack:** Static JS modules, existing Node tests, browser smoke tests.

---

## Refactor Rule

Do not refactor first. Migrate first.

After Phase 0 and Phase 1, refactor only the seam required by the next feature:

- AI follow-up needs `reading-client`.
- Result quality needs `result-renderer`.
- Clarification-card flow needs `followup`.
- Retention needs `history-store`.
- Spreads need `ritual-engine`.
- Meihua enhancement needs `meihua-engine`.

## Slice 1: `reading-client`

Trigger:

- Before implementing AI ordinary follow-up.

Responsibilities:

- call `reading`
- parse SSE
- surface warning/error events
- keep current `reading`, `meihua-reading`, `anchor`, `clarify` contracts

Files:

- Create: `assets/app/reading-client.js`
- Modify: `index.html`
- Test: new or existing syntax/contract tests

Acceptance:

- Existing tarot/meihua/daily generation still works.
- SSE errors still display.
- Tests pass.

## Slice 2: `result-renderer`

Trigger:

- Before expanding result structure or fixing empty states broadly.

Responsibilities:

- structured report rendering
- empty section hiding
- result label selection by mode
- history restore rendering

Files:

- Create: `assets/app/result-renderer.js`
- Modify: `index.html`
- Test: result contract tests

Acceptance:

- Current result page structure is unchanged.
- Empty sections are hidden.
- Stored records render the same as live records.

## Slice 3: `followup`

Trigger:

- Before ordinary AI follow-up and clarification-card report.

Responsibilities:

- ordinary follow-up state
- selected follow-up kind
- clarification-card handoff
- follow-up persistence shape

Files:

- Create: `assets/app/followup.js`
- Modify: `index.html`
- Test: clarify/follow-up contract tests

Acceptance:

- Ordinary follow-up never redraws.
- Clarification-card flow always redraws.
- Reset clears follow-up context.

## Slice 4: `history-store`

Trigger:

- Before action status, three-day review, weekly summary, or major history UI changes.

Responsibilities:

- record normalization
- legacy storage migration
- cloud row conversion
- sync merge rules

Files:

- Modify: `assets/app/storage.js`
- Modify: `assets/app/sync.js`
- Optional create: `assets/app/history-store.js`
- Tests: `tests/storage.test.mjs`, `tests/sync.test.mjs`

Acceptance:

- local history limit still works.
- daily anchor still works.
- cloud sync still dedupes.
- old localStorage keys remain readable during migration.

## Slice 5: `ritual-engine`

Trigger:

- Before multi-card spreads.

Responsibilities:

- build deck
- manage selection count
- return selected cards with positions
- keep one-card ritual unchanged

Files:

- Create: `assets/app/ritual-engine.js`
- Modify: `index.html`
- Tests: new spread/ritual tests

Acceptance:

- one-card flow is unchanged.
- three-card flow can be added without duplicating ritual state.

## Slice 6: `meihua-engine`

Trigger:

- Before adding cast methods beyond current time behavior.

Responsibilities:

- current time cast
- seed number cast
- seed text cast
- deterministic gua payload

Files:

- Modify: `assets/app/meihua.js`
- Tests: `tests/meihua.test.mjs`

Acceptance:

- current tests still pass.
- same seed gives same gua.
- different seeds produce explainable differences.

## Global Refactor Acceptance

Every refactor slice must satisfy:

- [ ] no unrelated visual redesign
- [ ] no product behavior change unless the slice explicitly says so
- [ ] existing tests pass
- [ ] browser smoke test passes for affected flow
- [ ] diff is limited to the seam being extracted

