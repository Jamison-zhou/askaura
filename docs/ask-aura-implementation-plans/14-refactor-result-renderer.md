# Refactor Slice: Result Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract result-report data preparation from `index.html` into a focused module while preserving live result and history restore behavior.

**Architecture:** Create `assets/app/result-renderer.js` for pure helpers: action advice fallback, gua description, tagged-token parsing, action extraction, and report normalization from stored records. Keep DOM writes in `index.html` for this slice so the visible page structure and animation timing stay unchanged.

**Tech Stack:** Static ES modules, browser DOM in `index.html`, Node `.mjs` contract tests, production browser smoke.

---

## Current Decision

Do this slice after `reading-client` is verified.

Do not move DOM animation, follow-up state, share state, or review state in this slice. Those are separate seams.

## File Structure

- Create: `assets/app/result-renderer.js`
  - Exports `cleanResultText(value, fallback)`.
  - Exports `parseTaggedTokens(text)`.
  - Exports `buildActionAdvice(actionText, { language })`.
  - Exports `describeGua(gua, { language })`.
  - Exports `actionFromRecord(record)`.
  - Exports `reportFromRecord(record, { language })`.
- Modify: `index.html`
  - Imports the module helpers.
  - Keeps `renderStructuredReport(data)` as the DOM-writing function.
  - Replaces local `actionAdvice`, `guaDescription`, `reportFromRecord`, and `actionFromRecord` bodies with calls to module helpers.
- Add: `tests/result-renderer.test.mjs`
  - Tests Chinese and English action advice fallback.
  - Tests tagged-token parsing.
  - Tests gua description.
  - Tests stored record report normalization for tarot, meihua, and dual records.

---

## Current Status

- [x] Plan written.
- [x] Contract/unit tests added.
- [x] `result-renderer.js` implemented.
- [x] `index.html` delegates data preparation to result renderer helpers.
- [x] Full tests pass.
- [x] Production browser smoke confirms live result still renders action board and has no mobile horizontal overflow.

Deployment note:

- `npx vercel deploy --prod --yes` deployed `dpl_8agbqxjkm116ZGrN2jjtXfauRcvr` and aliased it to `https://askaura.vercel.app`.
- Production click-through smoke at `https://askaura.vercel.app/index.html?pwsmoke=result-renderer-retry` completed one live meihua reading. The `reading` function returned 200 with `[DONE]`, `#action-do`, `#action-dont`, and `#action-watch` rendered, and 390px viewport had no horizontal overflow.
- One earlier smoke attempt failed at page navigation with `net::ERR_CONNECTION_CLOSED`; retry succeeded before any app-level issue was observed. The only console error on the passing run was a 404 resource request unrelated to the reading flow.

## Task 1: Unit Test First

**Files:**
- Add: `tests/result-renderer.test.mjs`

- [ ] Test:
  - `buildActionAdvice("", { language: "zh" })` returns the existing Chinese fallback copy.
  - `buildActionAdvice("Take one small step.", { language: "en" })` uses the passed action as `doText`.
  - `parseTaggedTokens("[ACTION] A\\nnext")` keeps multiline token content.
  - `describeGua({ name, en, image, essence }, { language })` matches current Chinese and English punctuation.
  - `reportFromRecord(record, { language: "zh" })` preserves stored `report` when present.
  - `reportFromRecord(record, { language: "en" })` derives summary/action from legacy tagged answers.
  - `reportFromRecord(dualRecord, { language: "zh" })` derives the current dual fallback sentence.

Run:

```powershell
node --experimental-vm-modules tests/result-renderer.test.mjs
```

Expected before implementation: FAIL because the module does not exist.

## Task 2: Result Renderer Module

**Files:**
- Add: `assets/app/result-renderer.js`

- [ ] Implement pure helpers only. No DOM access.
- [ ] Keep fallback strings byte-for-byte equivalent to current `index.html` behavior.
- [ ] Keep `reportFromRecord(record, { language })` returning `null` when no summary, tarot, gua, or dual text exists.

Run:

```powershell
node --experimental-vm-modules tests/result-renderer.test.mjs
```

Expected after implementation: PASS.

## Task 3: Index Integration

**Files:**
- Modify: `index.html`

- [ ] Import helpers from `./assets/app/result-renderer.js`.
- [ ] Keep `cleanText()` for general page use.
- [ ] Replace local `actionAdvice(actionText)` with `return buildActionAdvice(actionText, { language: lang });`.
- [ ] Replace local `guaDescription(gua)` with `return describeGua(gua, { language: lang });`.
- [ ] Replace local `reportFromRecord(record)` with `return normalizeReportFromRecord(record, { language: lang });`.
- [ ] Replace local `actionFromRecord(record)` with `return actionFromResultRecord(record);`.
- [ ] Leave `renderStructuredReport(data)` DOM writes unchanged.

Run:

```powershell
node --experimental-vm-modules tests/result-renderer.test.mjs
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

- `index.html` no longer owns report normalization from stored records.
- Existing live result rendering stays visually unchanged.
- Stored tarot, meihua, dual, daily, and shared results still render through the same DOM surface.
- Empty reports still return `null` and hide the report UI.
- No unrelated UI or product behavior changes.
