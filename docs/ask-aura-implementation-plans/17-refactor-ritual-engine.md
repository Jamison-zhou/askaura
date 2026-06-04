# Refactor Slice: Ritual Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract tarot deck, spread positions, card layout, and selected-card record shaping into a focused module while preserving current one-card, multi-card spread, and dual-mode ritual behavior.

**Architecture:** Create `assets/app/ritual-engine.js` for pure helpers only. Keep DOM creation, animation classes, delays, click listeners, and ritual cancellation in `index.html` for this slice.

**Tech Stack:** Static ES modules, browser DOM in `index.html`, Node `.mjs` tests, production browser smoke.

---

## Current Decision

Do this slice after `History Store` is verified.

Do not redesign the ritual UI, change timing, change card images, add new spreads, or alter the user selection flow. This slice only centralizes data and selection-result shaping so later spread work can build on it.

## File Structure

- Create: `assets/app/ritual-engine.js`
  - Exports `TAROT_DECK`.
  - Exports `SPREAD_TYPES`.
  - Exports `spreadPositions(type, labels)`.
  - Exports `spreadDisplayName(type, labels)`.
  - Exports `ritualCardLayout(index, deckLength)`.
  - Exports `ritualSpreadTypeForMode(mode, selectedSpreadType)`.
  - Exports `recordCardFromSelection(selection, { language, singleLabel, random })`.
  - Exports `primaryCardFromRecordCards(cards)`.
  - Exports `cardKeywords(cardName, { language })`.
- Modify: `index.html`
  - Imports ritual helpers.
  - Replaces local `tarotDeck` with `TAROT_DECK`.
  - Keeps existing local function names as wrappers where tests and call sites expect them.
  - Keeps `buildRitualDeck()`, `waitForCardChoice()`, and `playRitual()` DOM/animation logic in place.
- Add: `tests/ritual-engine.test.mjs`
  - Tests deck size and card tuple shape.
  - Tests all spread position keys and labels.
  - Tests fallback to single spread.
  - Tests layout output for first/middle/last card.
  - Tests dual mode forces single spread.
  - Tests selected-card record shaping and orientation injection.
  - Tests primary card selection.
  - Tests Chinese and English keywords.

---

## Current Status

- [x] Plan written.
- [x] Contract/unit tests added.
- [x] `ritual-engine.js` implemented.
- [x] `index.html` delegates ritual data helpers to the module.
- [x] Full tests pass.
- [x] Production browser smoke confirms one live tarot draw still saves a selected card.

Deployment note:

- `npx vercel deploy --prod --yes` deployed `dpl_Y74xD1RoYE8M5Ws8MxQtCziTwbW6` and aliased it to `https://askaura.vercel.app`.
- Production tarot smoke at `https://askaura.vercel.app/index.html?pwsmoke=ritual-engine` completed one live single-card tarot reading. The `reading` function returned 200 with `[DONE]`, the result title rendered as single-card tarot, `askaura.history.v1` contained one saved record with `spreadType: "single"` and one selected card, and the viewport had no horizontal overflow. One navigation attempt timed out before app logic; retry succeeded.

## Task 1: Unit Test First

**Files:**
- Add: `tests/ritual-engine.test.mjs`

- [x] Test:
  - `TAROT_DECK.length === 22`.
  - every deck item has English name, Chinese name, and image filename.
  - `spreadPositions("three_current_resistance_next", labels)` returns `current`, `resistance`, `next`.
  - unknown spread falls back to one `single` position.
  - `spreadDisplayName("relationship_tension", labels)` returns relationship label.
  - `ritualSpreadTypeForMode("dual", "relationship_tension")` returns `"single"`.
  - `ritualCardLayout(0, 22)`, middle card, and last card return stable numeric/string layout fields.
  - `recordCardFromSelection()` returns current saved-card shape and honors injected orientation randomizer.
  - `primaryCardFromRecordCards()` returns the first card or `null`.
  - `cardKeywords("女祭司", { language: "zh" })` and `cardKeywords("The High Priestess", { language: "en" })` return existing keywords.

Run:

```powershell
node --experimental-vm-modules tests/ritual-engine.test.mjs
```

Expected before implementation: FAIL because the module does not exist.

## Task 2: Ritual Engine Module

**Files:**
- Add: `assets/app/ritual-engine.js`

- [x] Move the 22-card tuple deck into `TAROT_DECK`.
- [x] Move spread key definitions into pure helpers with labels injected from `index.html`.
- [x] Move card fan layout math into `ritualCardLayout(index, deckLength)`.
- [x] Move selected-card record shaping into `recordCardFromSelection()`.
- [x] Move primary-card and keyword helpers into the module.
- [x] Keep output equivalent to current `index.html` behavior.

Run:

```powershell
node --experimental-vm-modules tests/ritual-engine.test.mjs
```

Expected after implementation: PASS.

## Task 3: Index Integration

**Files:**
- Modify: `index.html`

- [x] Import helpers from `./assets/app/ritual-engine.js`.
- [x] Replace local `tarotDeck` definition with `const tarotDeck = TAROT_DECK;`.
- [x] Keep local `spreadPositions()`, `spreadDisplayName()`, `recordCardFromSelection()`, `primaryCardFromRecordCards()`, and `cardKeywords()` as wrappers so existing call sites stay unchanged.
- [x] Replace inline layout math in `buildRitualDeck()` with `ritualCardLayout(index, tarotDeck.length)`.
- [x] Use `ritualSpreadTypeForMode(nextMode, selectedSpreadType)` inside `playRitual()`.
- [x] Leave event listeners, `waitForCardChoice()`, animation class names, and delays unchanged.

Run:

```powershell
node --experimental-vm-modules tests/ritual-engine.test.mjs
node tests/phase4-spreads-gua-contract.test.mjs
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
- One tarot single-card draw can choose and confirm a card.
- The result reaches `[DONE]`.
- The saved history record contains one selected card.
- No horizontal overflow on 390px.

---

## Completion Criteria

- `index.html` no longer owns tarot deck data or spread-position data.
- One-card tarot flow is unchanged.
- Multi-card spreads still prevent duplicate card selection.
- Dual mode still uses a single selected tarot card plus gua.
- Selected card records keep the same shape.
- No unrelated visual redesign or product behavior changes.
