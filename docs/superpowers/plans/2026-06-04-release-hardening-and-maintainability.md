# AskAura Release Hardening And Maintainability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the current release risks by adding authenticated smoke coverage, tightening deployment/config guardrails, and reducing the largest frontend maintenance hotspots without changing product behavior.

**Architecture:** Treat production readiness as three independent layers: release verification first, security/config guardrails second, and maintainability cleanup third. Keep AskAura as a static frontend with native JS modules and Supabase Edge Functions; do not introduce a bundler or new framework.

**Tech Stack:** Static HTML/CSS, native JavaScript modules, Node `.mjs` tests, PowerShell local commands, Supabase Edge Functions, Supabase REST/Auth APIs.

---

## Success Criteria

- A release smoke command can verify admin config read/save, signed-in history sync, share-link create/revoke, resonance submit/revoke, and RLS ownership behavior when test credentials are provided through environment variables.
- Existing 25 `.test.mjs` files still pass.
- No active code references the old cijing Supabase project.
- Browser-sent paid/pro tier cannot unlock paid behavior.
- CSP and frontend config remain compatible with the static deployment model.
- `index.html` loses one or more self-contained logic blocks to focused modules without visual or contract regressions.

## File Map

- Modify: `D:\askaura\tests\release-smoke-authenticated.mjs` - new opt-in authenticated smoke runner.
- Modify: `D:\askaura\tests\release-smoke-authenticated.test.mjs` - unit tests for the smoke runner helpers, no real network.
- Modify: `D:\askaura\docs\smoke-reports\pre-release-smoke-2026-06-04.md` - append the new authenticated smoke procedure and status after it is run.
- Modify: `D:\askaura\README.md` and `D:\askaura\DEPLOY.md` - document release smoke command and required environment variables without storing secrets.
- Modify: `D:\askaura\assets\app\config.js` - centralize public Supabase config validation.
- Modify: `D:\askaura\index.html` and `D:\askaura\admin.html` - consume shared public config helper.
- Modify: `D:\askaura\tests\askaura-migration-static.test.mjs` - expand active-code boundary checks.
- Modify: `D:\askaura\_headers` - tighten CSP only as far as current static HTML allows.
- Modify: `D:\askaura\assets\app\ui-state.js` - extract small, behavior-preserving UI state helpers from `index.html`.
- Modify: `D:\askaura\tests\ui-state.test.mjs` - cover extracted UI state helpers.

---

## Phase 1: Authenticated Release Smoke

### Task 1: Add an opt-in authenticated smoke runner

**Files:**
- Create: `D:\askaura\tests\release-smoke-authenticated.mjs`
- Test: `D:\askaura\tests\release-smoke-authenticated.test.mjs`

- [ ] **Step 1: Add unit tests for env validation and response checks**

Create `tests/release-smoke-authenticated.test.mjs`:

```js
import assert from "node:assert/strict";
import {
  assertOk,
  requireSmokeEnv,
  redact,
} from "./release-smoke-authenticated.mjs";

const env = {
  ASKAURA_SMOKE_SUPABASE_URL: "https://example.supabase.co",
  ASKAURA_SMOKE_ANON_KEY: "sb_publishable_example",
  ASKAURA_SMOKE_USER_EMAIL: "smoke@example.com",
  ASKAURA_SMOKE_USER_PASSWORD: "secret-password",
  ASKAURA_SMOKE_ADMIN_USERNAME: "admin",
  ASKAURA_SMOKE_ADMIN_PASSWORD: "admin-password",
};

assert.deepEqual(requireSmokeEnv(env), env);
assert.equal(redact("abcdef123456"), "abcd...3456");
assert.doesNotThrow(() => assertOk({ status: 200, body: { ok: true } }, "sample"));
assert.throws(
  () => assertOk({ status: 401, body: { error: "Unauthorized" } }, "sample"),
  /sample failed: 401/
);

assert.throws(
  () => requireSmokeEnv({ ...env, ASKAURA_SMOKE_USER_PASSWORD: "" }),
  /Missing required smoke env: ASKAURA_SMOKE_USER_PASSWORD/
);

console.log("release authenticated smoke helper tests passed");
```

- [ ] **Step 2: Run the failing helper test**

Run:

```powershell
node tests/release-smoke-authenticated.test.mjs
```

Expected: fail because `tests/release-smoke-authenticated.mjs` does not exist.

- [ ] **Step 3: Implement the smoke runner helpers and CLI skeleton**

Create `tests/release-smoke-authenticated.mjs`:

```js
const REQUIRED_ENV = [
  "ASKAURA_SMOKE_SUPABASE_URL",
  "ASKAURA_SMOKE_ANON_KEY",
  "ASKAURA_SMOKE_USER_EMAIL",
  "ASKAURA_SMOKE_USER_PASSWORD",
  "ASKAURA_SMOKE_ADMIN_USERNAME",
  "ASKAURA_SMOKE_ADMIN_PASSWORD",
];

export function requireSmokeEnv(env = process.env) {
  const values = {};
  for (const key of REQUIRED_ENV) {
    const value = String(env[key] || "").trim();
    if (!value) throw new Error(`Missing required smoke env: ${key}`);
    values[key] = value;
  }
  return values;
}

export function redact(value) {
  const text = String(value || "");
  if (text.length <= 8) return "********";
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

export function assertOk(result, label) {
  if (result.status >= 200 && result.status < 300) return;
  throw new Error(`${label} failed: ${result.status} ${JSON.stringify(result.body)}`);
}

async function jsonFetch(fetchImpl, url, { method = "POST", headers = {}, body } = {}) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  return { status: response.status, headers: response.headers, body: parsed };
}

export async function runAuthenticatedSmoke({ env = process.env, fetchImpl = fetch } = {}) {
  const config = requireSmokeEnv(env);
  const baseUrl = config.ASKAURA_SMOKE_SUPABASE_URL.replace(/\/+$/, "");
  const anonKey = config.ASKAURA_SMOKE_ANON_KEY;
  const fnUrl = `${baseUrl}/functions/v1`;
  const restUrl = `${baseUrl}/rest/v1`;

  console.log(`Smoke target: ${baseUrl}`);
  console.log(`Anon key: ${redact(anonKey)}`);

  const adminLogin = await jsonFetch(fetchImpl, `${fnUrl}/admin-config`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: {
      action: "login",
      username: config.ASKAURA_SMOKE_ADMIN_USERNAME,
      password: config.ASKAURA_SMOKE_ADMIN_PASSWORD,
    },
  });
  assertOk(adminLogin, "admin login");
  const adminToken = adminLogin.body.token;
  if (!adminToken) throw new Error("admin login did not return token");

  const adminGet = await jsonFetch(fetchImpl, `${fnUrl}/admin-config`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${adminToken}` },
    body: { action: "get" },
  });
  assertOk(adminGet, "admin config get");

  const auth = await jsonFetch(fetchImpl, `${baseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: {
      email: config.ASKAURA_SMOKE_USER_EMAIL,
      password: config.ASKAURA_SMOKE_USER_PASSWORD,
    },
  });
  assertOk(auth, "user sign in");
  const accessToken = auth.body.access_token;
  if (!accessToken) throw new Error("user sign in did not return access_token");

  const smokeId = `smoke-${Date.now()}`;
  const insertRecord = await jsonFetch(fetchImpl, `${restUrl}/askaura_reflection_records?on_conflict=id`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: [{
      id: smokeId,
      mode: "daily",
      title: "Smoke",
      question: "Smoke verification",
      answer: "Smoke answer",
      action: "Write one line today.",
      language: "en",
    }],
  });
  assertOk(insertRecord, "history insert");

  const readOwn = await jsonFetch(fetchImpl, `${restUrl}/askaura_reflection_records?select=id&id=eq.${encodeURIComponent(smokeId)}`, {
    method: "GET",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  assertOk(readOwn, "history select own");
  if (!Array.isArray(readOwn.body) || readOwn.body.length !== 1) {
    throw new Error("history select own did not return inserted smoke record");
  }

  const createShare = await jsonFetch(fetchImpl, `${fnUrl}/share-link`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    body: { action: "create", recordId: smokeId, includeQuestion: false },
  });
  assertOk(createShare, "share create");

  if (createShare.body.id) {
    const revokeShare = await jsonFetch(fetchImpl, `${fnUrl}/share-link`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      body: { action: "revoke", id: createShare.body.id },
    });
    assertOk(revokeShare, "share revoke");
  }

  const submitResonance = await jsonFetch(fetchImpl, `${fnUrl}/resonance-pool`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    body: { action: "submit", recordId: smokeId },
  });
  assertOk(submitResonance, "resonance submit");

  if (submitResonance.body.id) {
    const revokeResonance = await jsonFetch(fetchImpl, `${fnUrl}/resonance-pool`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      body: { action: "revoke", id: submitResonance.body.id },
    });
    assertOk(revokeResonance, "resonance revoke");
  }

  const cleanup = await jsonFetch(fetchImpl, `${restUrl}/askaura_reflection_records?id=eq.${encodeURIComponent(smokeId)}`, {
    method: "DELETE",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  assertOk(cleanup, "history cleanup");

  return { ok: true, smokeId };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthenticatedSmoke()
    .then(() => console.log("authenticated release smoke passed"))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run helper and full local tests**

Run:

```powershell
node tests/release-smoke-authenticated.test.mjs
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true } }; if ($failed) { exit 1 }
```

Expected: all tests pass.

- [ ] **Step 5: Run live authenticated smoke with secrets from shell only**

Run after setting env vars outside git/chat:

```powershell
node tests/release-smoke-authenticated.mjs
```

Expected: `authenticated release smoke passed`.

### Task 2: Document release smoke usage and update smoke status

**Files:**
- Modify: `D:\askaura\README.md`
- Modify: `D:\askaura\DEPLOY.md`
- Modify: `D:\askaura\docs\smoke-reports\pre-release-smoke-2026-06-04.md`

- [ ] **Step 1: Add smoke command docs**

Add this section to both `README.md` and `DEPLOY.md`:

```markdown
## Authenticated Release Smoke

Run this only with secrets provided through the local shell environment. Do not write these values into code, docs, git, or chat.

Required environment variables:

- `ASKAURA_SMOKE_SUPABASE_URL`
- `ASKAURA_SMOKE_ANON_KEY`
- `ASKAURA_SMOKE_USER_EMAIL`
- `ASKAURA_SMOKE_USER_PASSWORD`
- `ASKAURA_SMOKE_ADMIN_USERNAME`
- `ASKAURA_SMOKE_ADMIN_PASSWORD`

Command:

```powershell
node tests/release-smoke-authenticated.mjs
```

This verifies admin login/config read, signed-in record write/read/delete, share-link create/revoke, and resonance submit/revoke against the AskAura Supabase project.
```

- [ ] **Step 2: Update smoke report after live run**

Append this to `docs/smoke-reports/pre-release-smoke-2026-06-04.md` after the authenticated run succeeds:

```markdown
## Authenticated Smoke Addendum

- Admin login/config read: Pass
- Signed-in history write/read/delete: Pass
- Share-link create/revoke: Pass
- Resonance submit/revoke: Pass
- Secrets handling: environment variables only; no secrets written to repo
```

If the live run is not yet performed, append this instead:

```markdown
## Authenticated Smoke Addendum

Status: Pending.

Run `node tests/release-smoke-authenticated.mjs` with smoke credentials from the local shell before production promotion.
```

- [ ] **Step 3: Verify docs and tests**

Run:

```powershell
node tests/release-smoke-authenticated.test.mjs
node tests/askaura-migration-static.test.mjs
```

Expected: both pass.

---

## Phase 2: Config And Deployment Guardrails

### Task 3: Centralize public Supabase config validation

**Files:**
- Create: `D:\askaura\assets\app\config.js`
- Modify: `D:\askaura\index.html`
- Modify: `D:\askaura\admin.html`
- Test: `D:\askaura\tests\config.test.mjs`

- [ ] **Step 1: Add config tests**

Create `tests/config.test.mjs`:

```js
import assert from "node:assert/strict";
import {
  getAskAuraConfig,
  normalizeSupabaseUrl,
} from "../assets/app/config.js";

assert.equal(
  normalizeSupabaseUrl("https://oeqekrlodqxjlakdjqpu.supabase.co/"),
  "https://oeqekrlodqxjlakdjqpu.supabase.co"
);

assert.deepEqual(getAskAuraConfig({
  ASKAURA_SUPABASE_URL: "https://oeqekrlodqxjlakdjqpu.supabase.co/",
  ASKAURA_SUPABASE_ANON_KEY: "sb_publishable_example",
}), {
  supabaseUrl: "https://oeqekrlodqxjlakdjqpu.supabase.co",
  anonKey: "sb_publishable_example",
});

assert.throws(
  () => getAskAuraConfig({ ASKAURA_SUPABASE_URL: "https://icvegpfnpkyrebtojoca.supabase.co", ASKAURA_SUPABASE_ANON_KEY: "x" }),
  /old cijing Supabase project/
);

assert.throws(
  () => getAskAuraConfig({ ASKAURA_SUPABASE_URL: "", ASKAURA_SUPABASE_ANON_KEY: "x" }),
  /Missing ASKAURA_SUPABASE_URL/
);

console.log("config tests passed");
```

- [ ] **Step 2: Implement config helper**

Create `assets/app/config.js`:

```js
const OLD_CIJING_REF = "icvegpfnpkyrebtojoca";

export function normalizeSupabaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function getAskAuraConfig(source = globalThis) {
  const supabaseUrl = normalizeSupabaseUrl(source.ASKAURA_SUPABASE_URL);
  const anonKey = String(source.ASKAURA_SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl) throw new Error("Missing ASKAURA_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing ASKAURA_SUPABASE_ANON_KEY");
  if (supabaseUrl.includes(OLD_CIJING_REF)) {
    throw new Error("AskAura must not target the old cijing Supabase project");
  }

  return { supabaseUrl, anonKey };
}
```

- [ ] **Step 3: Use helper in `index.html`**

Change the module import area in `index.html` to include:

```js
import { getAskAuraConfig } from "./assets/app/config.js";
```

Replace the direct config usage with:

```js
const publicConfig = getAskAuraConfig(window);
const API_URL = publicConfig.supabaseUrl + "/functions/v1/reading";
const CONFIG_API_URL = publicConfig.supabaseUrl + "/functions/v1/admin-config";
const API_AUTH = "Bearer " + publicConfig.anonKey;
```

And pass `publicConfig.supabaseUrl` / `publicConfig.anonKey` to `createSyncClient`.

- [ ] **Step 4: Use helper in `admin.html`**

Change the admin script to import:

```js
import { getAskAuraConfig } from "./assets/app/config.js";
```

Replace hardcoded URL/key reads with:

```js
const publicConfig = getAskAuraConfig(window);
const SUPABASE_URL = publicConfig.supabaseUrl;
const SUPABASE_ANON_KEY = publicConfig.anonKey;
const CONFIG_API_URL = SUPABASE_URL + "/functions/v1/admin-config";
```

If `admin.html` does not currently define `window.ASKAURA_SUPABASE_URL` and `window.ASKAURA_SUPABASE_ANON_KEY`, add the same public config script shape used by `index.html`.

- [ ] **Step 5: Verify**

Run:

```powershell
node tests/config.test.mjs
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
```

Expected: all pass.

### Task 4: Expand active-code boundary checks

**Files:**
- Modify: `D:\askaura\tests\askaura-migration-static.test.mjs`

- [ ] **Step 1: Add checks for service secrets and old ref in active files**

Update the active file list to include:

```js
const activeFiles = [
  "index.html",
  "admin.html",
  "_headers",
  "assets/app/config.js",
  "assets/app/storage.js",
  "assets/app/sync.js",
  "supabase/functions/reading/index.ts",
  "supabase/functions/admin-config/index.ts",
];
```

Add assertions:

```js
for (const file of activeFiles) {
  const text = read(file);
  assert.equal(text.includes("icvegpfnpkyrebtojoca"), false, `${file} must not target old cijing Supabase`);
  assert.equal(text.includes("SUPABASE_SERVICE_ROLE_KEY="), false, `${file} must not contain service role key assignments`);
  assert.equal(/service_role_[A-Za-z0-9_-]+/.test(text), false, `${file} must not contain service role key values`);
}
```

- [ ] **Step 2: Verify**

Run:

```powershell
node tests/askaura-migration-static.test.mjs
```

Expected: pass.

### Task 5: Tighten CSP within static constraints

**Files:**
- Modify: `D:\askaura\_headers`
- Test: `D:\askaura\tests\security-headers.test.mjs`

- [ ] **Step 1: Add header contract test**

Create `tests/security-headers.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const headers = fs.readFileSync("_headers", "utf8");

assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/);
assert.match(headers, /Permissions-Policy:\s*camera=\(\), microphone=\(\), geolocation=\(\)/);
assert.match(headers, /frame-ancestors 'none'/);
assert.match(headers, /connect-src 'self' https:\/\/oeqekrlodqxjlakdjqpu\.supabase\.co/);
assert.equal(headers.includes("icvegpfnpkyrebtojoca"), false);

console.log("security headers tests passed");
```

- [ ] **Step 2: Keep CSP compatible but explicit**

Keep `_headers` as:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://oeqekrlodqxjlakdjqpu.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Do not remove `'unsafe-inline'` in this task because the current static HTML still uses inline scripts/styles.

- [ ] **Step 3: Verify**

Run:

```powershell
node tests/security-headers.test.mjs
```

Expected: pass.

---

## Phase 3: Frontend Maintainability

### Task 6: Extract small UI state helpers from `index.html`

**Files:**
- Create: `D:\askaura\assets\app\ui-state.js`
- Modify: `D:\askaura\index.html`
- Test: `D:\askaura\tests\ui-state.test.mjs`

- [ ] **Step 1: Add tests for pure UI helpers**

Create `tests/ui-state.test.mjs`:

```js
import assert from "node:assert/strict";
import {
  isBusyState,
  nextToneForMode,
  viewStateClass,
} from "../assets/app/ui-state.js";

assert.equal(isBusyState("streaming"), true);
assert.equal(isBusyState("idle"), false);
assert.equal(nextToneForMode("meihua"), "meihua");
assert.equal(nextToneForMode("dual"), "dual");
assert.equal(nextToneForMode("unknown"), "tarot");
assert.equal(viewStateClass({ hasResult: true, isBusy: false }), "has-result");
assert.equal(viewStateClass({ hasResult: false, isBusy: true }), "is-busy");
assert.equal(viewStateClass({ hasResult: false, isBusy: false }), "is-idle");

console.log("ui state tests passed");
```

- [ ] **Step 2: Implement pure helpers**

Create `assets/app/ui-state.js`:

```js
const BUSY_STATES = new Set(["clarifying", "drawing", "streaming", "saving"]);
const MODE_TONES = new Map([
  ["tarot", "tarot"],
  ["daily", "tarot"],
  ["meihua", "meihua"],
  ["dual", "dual"],
]);

export function isBusyState(state) {
  return BUSY_STATES.has(String(state || ""));
}

export function nextToneForMode(mode) {
  return MODE_TONES.get(String(mode || "")) || "tarot";
}

export function viewStateClass({ hasResult = false, isBusy = false } = {}) {
  if (isBusy) return "is-busy";
  if (hasResult) return "has-result";
  return "is-idle";
}
```

- [ ] **Step 3: Replace matching inline logic in `index.html`**

Import:

```js
import { isBusyState, nextToneForMode, viewStateClass } from "./assets/app/ui-state.js";
```

Replace only equivalent logic. Do not change labels, markup, animation timing, or product copy in this task.

- [ ] **Step 4: Verify**

Run:

```powershell
node tests/ui-state.test.mjs
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/index-display-contract.test.mjs
```

Expected: all pass.

### Task 7: Continue extraction only where a test can protect behavior

**Files:**
- Candidate modules under `D:\askaura\assets\app\`
- Candidate tests under `D:\askaura\tests\`

- [ ] **Step 1: Identify one self-contained block**

Use this rule: extract only code that can be tested without a browser. Good candidates are formatting, mode selection, request payload construction, history display mapping, or share text generation.

- [ ] **Step 2: Add a focused test before extraction**

Example for share text generation:

```js
import assert from "node:assert/strict";
import { buildShareText } from "../assets/app/share-text.js";

assert.equal(
  buildShareText({ title: "Daily Anchor", action: "Write one line today." }),
  "Daily Anchor\nWrite one line today."
);

console.log("share text tests passed");
```

- [ ] **Step 3: Extract the minimal helper**

Example:

```js
export function buildShareText(record = {}) {
  return [record.title, record.action].filter(Boolean).join("\n");
}
```

- [ ] **Step 4: Replace the inline equivalent in `index.html`**

Only replace the exact behavior covered by the test.

- [ ] **Step 5: Verify after each extraction**

Run:

```powershell
node tests/<new-test-name>.test.mjs
node --experimental-vm-modules tests/index-syntax.test.mjs
```

Expected: both pass after every extraction.

Stop after one or two clean extractions. Do not turn this into a broad rewrite.

---

## Phase 4: Final Release Verification

### Task 8: Run full local verification

**Files:**
- No code changes unless a test fails.

- [ ] **Step 1: Run full tests**

Run:

```powershell
$failed = $false; Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object { Write-Host "RUN $($_.Name)"; node --experimental-vm-modules $_.FullName; if ($LASTEXITCODE -ne 0) { $failed = $true; Write-Host "FAIL $($_.Name) exit=$LASTEXITCODE" } else { Write-Host "PASS $($_.Name)" } }; if ($failed) { exit 1 }
```

Expected: every `.test.mjs` file passes.

- [ ] **Step 2: Serve locally**

Run:

```powershell
python -m http.server 5174 --directory D:\askaura
```

Expected: server listens at `http://127.0.0.1:5174/index.html`.

- [ ] **Step 3: Manual browser smoke**

Open:

```text
http://127.0.0.1:5174/index.html
http://127.0.0.1:5174/admin.html
```

Expected:

- Homepage renders AskAura brand and entry points.
- Tarot, Meihua, dual, and daily controls are visible.
- No document-level horizontal overflow at 390px width.
- Admin page renders login form.
- Browser console has no app-specific stack trace.

### Task 9: Run live release smoke and record go/no-go

**Files:**
- Modify: `D:\askaura\docs\smoke-reports\pre-release-smoke-2026-06-04.md`

- [ ] **Step 1: Run authenticated smoke**

Run:

```powershell
node tests/release-smoke-authenticated.mjs
```

Expected: `authenticated release smoke passed`.

- [ ] **Step 2: Check active-code boundary**

Run:

```powershell
rg -n "icvegpfnpkyrebtojoca|RILL_SUPABASE|rill_reflection_records|rill_daily_anchors|rill_runtime_config" index.html admin.html assets supabase --glob "!legacy/**"
```

Expected: no active-code matches except tests or comments that are explicit negative checks.

- [ ] **Step 3: Record release decision**

Append:

```markdown
## Final Go / No-Go Addendum

Decision: Go for production only if all of the following are true.

- Full local `.mjs` suite: Pass
- Local desktop/mobile smoke: Pass
- Authenticated admin smoke: Pass
- Authenticated user data smoke: Pass
- Share/resonance authenticated smoke: Pass
- Old cijing active-code scan: Pass
- Payment checkout remains disabled unless Phase 8B is separately completed: Pass
```

If any item fails, write `Decision: No-Go` and list the exact failed command and response.

---

## Recommended Commit Boundaries

1. `test: add authenticated release smoke`
2. `docs: document release smoke procedure`
3. `chore: centralize public AskAura config`
4. `test: expand deployment boundary checks`
5. `chore: tighten static security headers`
6. `refactor: extract tested ui state helpers`
7. `docs: record final release smoke result`

---

## Out Of Scope

- No payment checkout implementation.
- No migration to Vite, Next.js, or a build step.
- No redesign of the homepage or admin UI.
- No change to AI prompt product positioning.
- No real secrets in code, docs, git, or chat.

---

## Self-Review

- Spec coverage: Covers authenticated smoke gaps, config hardcoding risk, CSP guardrails, old project boundary, and frontend size risk.
- Placeholder scan: No task depends on unspecified future behavior. Optional extraction is constrained by a concrete test-first rule and stop condition.
- Type consistency: New helper names are consistent across tests and implementation snippets.
