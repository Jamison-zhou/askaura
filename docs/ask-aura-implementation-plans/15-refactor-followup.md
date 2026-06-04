# Refactor Slice: Followup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract follow-up and clarification-card data helpers from `index.html` while preserving the current ordinary follow-up and clarification-card behavior.

**Architecture:** Create `assets/app/followup.js` for pure helpers only: follow-up question selection, compact result summary, follow-up record append, stored follow-up formatting, clarification context, clarification link text, and clarification history text. Keep DOM events, streaming requests, and form state in `index.html` for this slice.

**Tech Stack:** Static ES modules, browser DOM in `index.html`, Node `.mjs` contract tests, production browser smoke.

---

## Current Decision

Do this slice after `reading-client` and `result-renderer` are verified.

Do not move `showFollowupAnswer()`, `drawClarificationCard()` form submission, or event listeners in this slice. Those pieces are tightly coupled to DOM state and should stay visible until the pure helper boundary is proven.

## File Structure

- Create: `assets/app/followup.js`
  - Exports `cleanFollowupText(value, fallback)`.
  - Exports `followupQuestionText(kind, customText, labels)`.
  - Exports `followupResultSummary(context)`.
  - Exports `createFollowupEntry({ question, answer, sourceResultId, now, idFactory })`.
  - Exports `appendFollowupToRecord(record, followup)`.
  - Exports `formatStoredFollowups(record)`.
  - Exports `createClarificationContext({ lastRecord, lastQuestion, fallbackQuestion, previousCard, resultSummary })`.
  - Exports `clarificationLinkText(context, { language })`.
  - Exports `clarificationHistoryText(context)`.
  - Exports `clarificationPromptText({ lastQuestion, fallbackQuestion, language })`.
- Modify: `index.html`
  - Imports the module helpers.
  - Keeps existing function names as thin wrappers so current tests and call sites remain stable.
  - Keeps ordinary follow-up streaming inside `showFollowupAnswer()`.
  - Keeps clarification-card redraw behavior inside `drawClarificationCard()`.
- Add: `tests/followup.test.mjs`
  - Tests ordinary question selection and custom text.
  - Tests compact result summary ordering.
  - Tests append behavior without mutating the original record.
  - Tests stored follow-up formatting.
  - Tests clarification context/link/history/prompt text in Chinese and English.

---

## Current Status

- [x] Plan written.
- [x] Contract/unit tests added.
- [x] `followup.js` implemented.
- [x] `index.html` delegates data helpers to followup module.
- [x] Full tests pass.
- [x] Production browser smoke confirms ordinary result rendering still works after the module import.
- [x] Production browser smoke confirms ordinary follow-up renders an inline answer and does not restart the ritual.

Deployment note:

- `npx vercel deploy --prod --yes` deployed `dpl_7Mi7VubMahji184mboF4AEyZjMbn` and aliased it to `https://askaura.vercel.app`.
- Production meihua smoke at `https://askaura.vercel.app/index.html?pwsmoke=followup-refactor` completed one live reading. The `reading` function returned 200 with `[DONE]`, `#action-do`, `#action-dont`, and `#action-watch` rendered, and 390px viewport had no horizontal overflow. The first navigation attempt hit `net::ERR_CONNECTION_CLOSED`; retry succeeded.
- Production ordinary follow-up smoke at `https://askaura.vercel.app/index.html?pwsmoke=ordinary-followup-clean` completed one tarot reading and one ordinary follow-up. Both `reading` calls returned 200 with `[DONE]`; `#followup-answer-text` rendered the follow-up answer; `#ritual-stage` stayed hidden during the ordinary follow-up. The script outcome was `timeout` only because it expected the submit button to become enabled after completion, but the UI correctly disables it after clearing the selected follow-up and empty custom input.

## Task 1: Unit Test First

**Files:**
- Add: `tests/followup.test.mjs`

- [x] Test:
  - `followupQuestionText("push", "", labels)` returns the label.
  - `followupQuestionText("custom", "  My question  ", labels)` returns the custom text.
  - `followupResultSummary(context)` joins summary, tarot, gua, dual, action, do, don't, and watch text in the current order.
  - `createFollowupEntry()` and `appendFollowupToRecord()` preserve the existing record and append a new follow-up.
  - `formatStoredFollowups()` returns the same `question\nanswer` blocks used by the current history UI.
  - `createClarificationContext()` captures previous result id, original question, previous card, and compact summary.
  - `clarificationLinkText()` matches the current Chinese and English copy.
  - `clarificationHistoryText()` matches the current session history format.
  - `clarificationPromptText()` matches the current Chinese and English input text.

Run:

```powershell
node --experimental-vm-modules tests/followup.test.mjs
```

Expected before implementation: FAIL because the module does not exist.

## Task 2: Followup Module

**Files:**
- Add: `assets/app/followup.js`

- [x] Implement pure helpers only. No DOM access.
- [x] Keep existing fallback copy equivalent to current `index.html` behavior.
- [x] Keep `appendFollowupToRecord()` returning `null` when there is no current record.
- [x] Keep clarification history lines in the existing order.

Run:

```powershell
node --experimental-vm-modules tests/followup.test.mjs
```

Expected after implementation: PASS.

## Task 3: Index Integration

**Files:**
- Modify: `index.html`

- [x] Import helpers from `./assets/app/followup.js`.
- [x] Keep `saveFollowupToCurrentRecord(question, answer)` as the side-effect wrapper that saves, syncs, rerenders history, updates `lastRecord`, and returns the appended follow-up.
- [x] Replace `renderStoredFollowups(record)` formatting with `formatStoredFollowups(record)`.
- [x] Replace `clarificationLinkText(context)` with module helper call.
- [x] Replace `clarificationHistoryText(context)` with module helper call.
- [x] Replace `followupQuestionText(kind, customText)` with module helper call using translated labels.
- [x] Replace `followupResultSummary()` with module helper call using `currentResultContext`.
- [x] Replace `drawClarificationCard()` context and input text construction with module helpers, but keep `els.form.requestSubmit()` unchanged.

Run:

```powershell
node --experimental-vm-modules tests/followup.test.mjs
node --experimental-vm-modules tests/phase2-followup-contract.test.mjs
node tests/clarify-contract.test.mjs
node --experimental-vm-modules tests/index-syntax.test.mjs
```

Expected: PASS.

## Task 4: Verification

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

- Ordinary follow-up still submits `mode: "followup"` and never starts the ritual form.
- Clarification-card choice still sets previous-result context and starts a new tarot draw.
- Stored follow-ups still restore into the answer panel.
- Reset/new result behavior remains unchanged.
- No unrelated UI or product behavior changes.
