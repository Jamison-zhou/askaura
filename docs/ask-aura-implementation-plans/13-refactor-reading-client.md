# Refactor Slice: Reading Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the reading Edge Function/SSE client from `index.html` into a focused module while preserving all current tarot, meihua, dual, daily, weekly, clarify, and follow-up behavior.

**Architecture:** Add `assets/app/reading-client.js` as a small dependency-injected client. Keep `index.html` call sites unchanged by retaining a local `streamReading(payload, onText)` wrapper that delegates to the module.

**Tech Stack:** Static ES modules, browser Fetch/SSE streams, existing Node `.mjs` contract tests, production browser smoke.

---

## Current Decision

Do this slice before any further AI-flow expansion or prompt/CMS work.

Do not refactor result rendering, history, follow-up state, or ritual state in this slice.

## File Structure

- Create: `assets/app/reading-client.js`
  - Exports `createReadingClient({ apiUrl, authToken, getLlmOptions, fetchImpl, timeoutMs })`.
  - Handles POST, timeout, SSE parsing, `delta`, `[DONE]`, and `error` events.
- Modify: `index.html`
  - Imports `createReadingClient`.
  - Creates `readingClient`.
  - Keeps `streamReading(payload, onText)` as a wrapper.
- Add: `tests/reading-client.test.mjs`
  - Unit-tests SSE parsing, timeout, HTTP errors, provider warnings, and payload merging.
- Add/Modify: contract tests only if static assumptions need updating.

---

## Current Status

- [x] Contract/unit tests added.
- [x] `reading-client.js` implemented.
- [x] `index.html` delegates to reading client with no call-site behavior change.
- [x] Full tests pass.
- [x] Production static smoke confirms `index.html` imports `reading-client.js` and production module is available.
- [x] In-app browser smoke confirms production page loads without console errors or horizontal overflow.
- [x] Full click-through browser smoke passed for a live meihua reading on production via Python Playwright + system Chrome: `reading` returned 200 with `[DONE]`, the action board rendered `#action-do`, `#action-dont`, and `#action-watch`, and 390px viewport had no horizontal overflow.

Deployment note:

- `npx vercel deploy --prod --yes` produced no terminal output and was terminated after the production site was checked.
- Production `index.html` at `https://askaura.vercel.app/index.html` contains the new import and wrapper, and `https://askaura.vercel.app/assets/app/reading-client.js` returns the module with `createReadingClient`.
- Production click-through smoke at `https://askaura.vercel.app/index.html?pwsmoke=chrome4` completed one live meihua reading. The only console error observed was a 404 resource request unrelated to the reading flow.

## Task 1: Unit Test First

**Files:**
- Add: `tests/reading-client.test.mjs`

- [ ] Test that:
  - request body merges `llm: getLlmOptions()`;
  - SSE `delta` chunks call `onText(fullText)`;
  - `[DONE]` returns final full text;
  - `{ "error": "..." }` throws;
  - non-OK response throws response text;
  - timeout aborts request.

Run:

```powershell
node --experimental-vm-modules tests/reading-client.test.mjs
```

Expected before implementation: FAIL.

## Task 2: Reading Client Module

**Files:**
- Add: `assets/app/reading-client.js`

- [ ] Implement `createReadingClient()` with dependency injection:

```js
export function createReadingClient({
  apiUrl,
  authToken,
  getLlmOptions = () => ({}),
  fetchImpl = globalThis.fetch,
  timeoutMs = 45000,
} = {}) {
  async function stream(payload, onText = () => {}) {
    // same behavior as existing index.html streamReading
  }

  return { stream };
}
```

## Task 3: Index Integration

**Files:**
- Modify: `index.html`

- [ ] Import `createReadingClient`.
- [ ] Instantiate it next to `syncClient`.
- [ ] Replace the existing `streamReading` body with:

```js
function streamReading(payload, onText) {
  return readingClient.stream(payload, onText);
}
```

- [ ] Leave all existing `streamReading(...)` call sites unchanged.

## Task 4: Verification

Run:

```powershell
node --experimental-vm-modules tests/reading-client.test.mjs
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true } }; if ($failed) { exit 1 }
```

Browser smoke:

- Production page loads.
- One daily reading reaches `[DONE]`.
- Follow-up panel still writes a streamed answer.
- No horizontal overflow on 390px.

---

## Completion Criteria

- `index.html` no longer owns raw Fetch/SSE parsing for reading.
- All existing AI flows still call `streamReading` and keep behavior.
- SSE errors still surface as thrown errors.
- Timeout remains 45 seconds.
- No unrelated UI or product behavior changes.
