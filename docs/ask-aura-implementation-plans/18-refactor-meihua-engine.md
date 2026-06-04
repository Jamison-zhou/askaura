# Refactor Slice: Meihua Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `meihua.js` engine boundary explicit and better tested while preserving current time, character, number, and casual-number cast behavior.

**Architecture:** Keep `assets/app/meihua.js` as the engine module. Add explicit cast method constants and pure normalization helpers, then expand tests around deterministic output and stored cast metadata. Keep UI controls, reading requests, result rendering, and dual-mode orchestration in `index.html`.

**Tech Stack:** Static ES modules, deterministic JavaScript helpers, Node `.mjs` tests, production browser smoke.

---

## Current Decision

Do this slice after `Ritual Engine` is verified.

Do not add new cast methods, change gua names/binaries, redesign the gua UI, or alter AI reading prompts in this slice. The purpose is to lock the engine contract before any future gua behavior work.

## File Structure

- Modify: `assets/app/meihua.js`
  - Export `GUA_CAST_METHODS`.
  - Export `normalizeGuaSeed(seed, method)`.
  - Keep `guaList`, `guaFromSeed()`, `guaFromTime()`, `guaFromCharacter()`, `guaFromNumber()`, `guaFromCasualNumber()`, and `guaFromCast()` public APIs.
  - Preserve current `{ name, en, binary, castMethod, seed }` output shape.
- Modify: `tests/meihua.test.mjs`
  - Add tests for method constants, seed normalization, empty/default seed handling, number cleanup, character slicing, unknown method fallback, and deterministic cast metadata.
- Modify only if needed: `tests/phase4-spreads-gua-contract.test.mjs`
  - Keep checking that front-end uses `guaFromCast(selectedGuaCastMethod, guaSeed)`.

---

## Current Status

- [x] Plan written.
- [x] Meihua engine tests expanded.
- [x] `meihua.js` exports explicit cast-method and seed-normalization helpers.
- [x] Existing front-end calls remain unchanged.
- [x] Full tests pass.
- [x] Production browser smoke confirms one live meihua reading still saves cast metadata.

Deployment note:

- `npx vercel deploy --prod --yes` deployed `dpl_2j6EFMLCwfCbHiqJmTJrEMuJ7eLN` and aliased it to `https://askaura.vercel.app`.
- Production meihua smoke at `https://askaura.vercel.app/index.html?pwsmoke=meihua-engine` completed one live number-cast reading. The `reading` function returned 200 with `[DONE]`, the saved history record contained `gua.castMethod: "number"`, normalized `gua.seed: "-42"`, and a 3-bit `gua.binary`, and 390px viewport had no horizontal overflow.

## Task 1: Test First

**Files:**
- Modify: `tests/meihua.test.mjs`

- [x] Add assertions:
  - `GUA_CAST_METHODS` exposes `time`, `character`, `number`, and `casual_number`.
  - `normalizeGuaSeed(" 问卦 ", "character")` returns `"问"`.
  - `normalizeGuaSeed("a-42b", "number")` returns `"-42"`.
  - `normalizeGuaSeed(" 108 ", "casual_number")` returns `"108"`.
  - `normalizeGuaSeed("", "number")` returns `""`.
  - `guaFromCast("unknown", "42", fixedDate)` falls back to time and records `castMethod: "time"`.
  - same character/number/casual inputs produce identical gua objects.
  - different numeric seeds can produce different deterministic gua objects.

Run:

```powershell
node tests/meihua.test.mjs
```

Expected before implementation: FAIL because `GUA_CAST_METHODS` and `normalizeGuaSeed()` do not exist.

## Task 2: Engine Helpers

**Files:**
- Modify: `assets/app/meihua.js`

- [x] Add:

```js
export const GUA_CAST_METHODS = Object.freeze({
  time: "time",
  character: "character",
  number: "number",
  casualNumber: "casual_number",
});
```

- [x] Add `normalizeGuaSeed(seed, method)` and use it inside `guaFromCharacter()`, `guaFromNumber()`, and `guaFromCasualNumber()`.
- [x] Keep `guaFromSeed()` deterministic and output shape unchanged.
- [x] Keep `guaFromCast()` fallback to `guaFromTime(date)`.

Run:

```powershell
node tests/meihua.test.mjs
```

Expected after implementation: PASS.

## Task 3: Verification

Run:

```powershell
node tests/phase4-spreads-gua-contract.test.mjs
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true } }; if ($failed) { exit 1 }
```

Browser smoke:

- Production page loads.
- One meihua reading with a non-time cast method reaches `[DONE]`.
- The saved history record contains `gua.castMethod`, `gua.seed`, and `gua.binary`.
- No horizontal overflow on 390px.

---

## Completion Criteria

- `meihua.js` has a clear, tested engine contract.
- Existing cast methods and metadata shape stay unchanged.
- Front-end mode selection and reading flow stay unchanged.
- Dual mode still uses current-time gua.
- No unrelated UI, prompt, or product behavior changes.
