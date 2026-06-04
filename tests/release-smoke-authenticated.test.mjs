import assert from "node:assert/strict";
import {
  assertOk,
  redact,
  requireSmokeEnv,
  runAuthenticatedSmoke,
} from "./release-smoke-authenticated.mjs";

const env = {
  ASKAURA_SMOKE_SUPABASE_URL: "https://example.supabase.co",
  ASKAURA_SMOKE_ANON_KEY: "sb_publishable_example",
  ASKAURA_SMOKE_USER_EMAIL: "smoke@example.com",
  ASKAURA_SMOKE_USER_PASSWORD: "secret-password",
  ASKAURA_SMOKE_ADMIN_USERNAME: "admin",
  ASKAURA_SMOKE_ADMIN_PASSWORD: "admin-password",
};

function mockResponse({ status = 200, body, text, headers = {} }) {
  return {
    status,
    headers,
    async text() {
      if (text !== undefined) return text;
      if (body === undefined) return "";
      return JSON.stringify(body);
    },
  };
}

function createFetchSequence(steps) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const step = steps[calls.length];
    if (!step) {
      throw new Error(`Unexpected fetch call ${calls.length + 1}: ${String(url)}`);
    }
    const body = init.body === undefined ? undefined : JSON.parse(init.body);
    const call = {
      url: String(url),
      method: init.method || "POST",
      headers: { ...(init.headers || {}) },
      body,
    };
    calls.push(call);
    if (typeof step.assert === "function") {
      step.assert(call);
    }
    return mockResponse(step.response || step);
  };
  return { calls, fetchImpl };
}

async function withFixedNow(now, fn) {
  const originalNow = Date.now;
  Date.now = () => now;
  try {
    await fn();
  } finally {
    Date.now = originalNow;
  }
}

assert.deepEqual(requireSmokeEnv(env), env);
assert.equal(redact("abcdef123456"), "abcd...3456");
assert.doesNotThrow(() => assertOk({ status: 200, body: { ok: true } }, "sample"));

assert.throws(
  () => assertOk({
    status: 401,
    body: {
      error: "Unauthorized",
      access_token: "very-secret-token",
      password: "top-secret-password",
      passwordHash: "hashed-password-secret",
      providerApiKey: "provider-api-key-value",
      serviceRoleKey: "service-role-key-value",
      config: {
        apiKey: "api-key-value",
      },
    },
  }, "sample"),
  (error) => {
    assert.match(error.message, /sample failed: 401/);
    assert.doesNotMatch(
      error.message,
      /very-secret-token|top-secret-password|hashed-password-secret|provider-api-key-value|service-role-key-value|api-key-value/,
    );
    assert.match(error.message, /\[redacted\]/);
    return true;
  },
);

assert.throws(
  () => assertOk({
    status: 500,
    rawText: `{"error":"failed","apiKey":"camel-api-key","providerApiKey":"provider-api-key","serviceRoleKey":"service-role-key","passwordHash":"raw-password-hash","access_token":"raw-access-token","password":"raw-password","details":"${"x".repeat(500)}"}`,
  }, "raw sample"),
  (error) => {
    assert.match(error.message, /raw sample failed: 500/);
    assert.doesNotMatch(
      error.message,
      /camel-api-key|provider-api-key|service-role-key|raw-password-hash|raw-access-token|raw-password/,
    );
    assert.ok(error.message.length < 360, "raw error body is capped");
    assert.match(error.message, /\[redacted\]/);
    return true;
  },
);

assert.throws(
  () => requireSmokeEnv({ ...env, ASKAURA_SMOKE_USER_PASSWORD: "" }),
  /Missing required smoke env: ASKAURA_SMOKE_USER_PASSWORD/,
);

await withFixedNow(1710000000000, async () => {
  const recordId = "release-smoke-1710000000000";
  const { calls, fetchImpl } = createFetchSequence([
    {
      assert(call) {
        assert.equal(call.url, "https://example.supabase.co/functions/v1/admin-config");
        assert.equal(call.headers.apikey, env.ASKAURA_SMOKE_ANON_KEY);
        assert.equal(call.headers.Authorization, `Bearer ${env.ASKAURA_SMOKE_ANON_KEY}`);
        assert.deepEqual(call.body, {
          action: "login",
          username: env.ASKAURA_SMOKE_ADMIN_USERNAME,
          password: env.ASKAURA_SMOKE_ADMIN_PASSWORD,
        });
      },
      response: { body: { token: "admin-jwt", config: { ops: { promptVersion: "v1" } } } },
    },
    {
      assert(call) {
        assert.equal(call.headers.Authorization, "Bearer admin-jwt");
        assert.deepEqual(call.body, { action: "get" });
      },
      response: { body: { config: { ops: { promptVersion: "v1" } } } },
    },
    {
      assert(call) {
        assert.equal(call.url, "https://example.supabase.co/auth/v1/token?grant_type=password");
        assert.equal(call.headers.Authorization, `Bearer ${env.ASKAURA_SMOKE_ANON_KEY}`);
        assert.deepEqual(call.body, {
          email: env.ASKAURA_SMOKE_USER_EMAIL,
          password: env.ASKAURA_SMOKE_USER_PASSWORD,
        });
      },
      response: { body: { access_token: "user-access-token" } },
    },
    {
      assert(call) {
        assert.equal(call.url, "https://example.supabase.co/rest/v1/askaura_reflection_records");
        assert.equal(call.method, "POST");
        assert.equal(call.headers.Authorization, "Bearer user-access-token");
        assert.equal(call.headers.Prefer, "resolution=merge-duplicates,return=representation");
        assert.equal(call.body[0].id, recordId);
      },
      response: { body: [{ id: recordId }] },
    },
    {
      assert(call) {
        assert.equal(call.method, "GET");
        assert.match(call.url, new RegExp(`id=eq\\.${recordId}`));
      },
      response: { body: [{ id: recordId }] },
    },
    {
      assert(call) {
        assert.equal(call.url, "https://example.supabase.co/functions/v1/share-link");
        assert.equal(call.headers.Authorization, "Bearer user-access-token");
        assert.equal(call.headers["x-askaura-origin"], "https://example.supabase.co");
        assert.deepEqual(call.body, {
          action: "create",
          recordId,
          includeQuestion: false,
        });
      },
      response: {
        body: {
          id: "share-1",
          url: "https://example.supabase.co/index.html?share=share-token",
        },
      },
    },
    {
      assert(call) {
        assert.equal(call.url, "https://example.supabase.co/functions/v1/resonance-pool");
        assert.deepEqual(call.body, {
          action: "submit",
          recordId,
        });
      },
      response: { body: { submission: { id: "submission-1" } } },
    },
    {
      assert(call) {
        assert.equal(call.url, "https://example.supabase.co/functions/v1/share-link");
        assert.deepEqual(call.body, {
          action: "revoke",
          id: "share-1",
        });
      },
      response: { body: { ok: true } },
    },
    {
      assert(call) {
        assert.equal(call.url, "https://example.supabase.co/functions/v1/resonance-pool");
        assert.deepEqual(call.body, {
          action: "revoke",
          id: "submission-1",
        });
      },
      response: { body: { ok: true } },
    },
    {
      assert(call) {
        assert.equal(call.method, "DELETE");
        assert.match(call.url, new RegExp(`id=eq\\.${recordId}`));
      },
      response: { body: [] },
    },
    {
      assert(call) {
        assert.equal(call.method, "GET");
        assert.match(call.url, new RegExp(`id=eq\\.${recordId}`));
      },
      response: { body: [] },
    },
  ]);

  await runAuthenticatedSmoke({ env, fetchImpl });
  assert.equal(calls.length, 11, "smoke flow makes the expected authenticated calls");
});

await withFixedNow(1710000000001, async () => {
  const { fetchImpl } = createFetchSequence([
    { response: { body: { token: "admin-jwt", config: { ok: true } } } },
    { response: { text: "not-json" } },
  ]);

  await assert.rejects(
    () => runAuthenticatedSmoke({ env, fetchImpl }),
    /admin config get/i,
    "invalid JSON on JSON endpoints should fail early",
  );
});

await withFixedNow(1710000000002, async () => {
  const recordId = "release-smoke-1710000000002";
  const { calls, fetchImpl } = createFetchSequence([
    { response: { body: { token: "admin-jwt", config: { ok: true } } } },
    { response: { body: { config: { ok: true } } } },
    { response: { body: { access_token: "user-access-token" } } },
    { response: { body: [{ id: recordId }] } },
    { response: { body: [{ id: recordId }] } },
    {
      response: {
        body: {
          id: "share-1",
          url: "https://example.supabase.co/index.html?share=share-token",
        },
      },
    },
    {
      response: {
        status: 500,
        body: {
          error: "submit failed",
          access_token: "leaked-access-token",
        },
      },
    },
    {
      response: {
        status: 500,
        body: {
          error: "cleanup failed",
          token: "leaked-share-token",
        },
      },
    },
    { response: { body: [] } },
    { response: { body: [] } },
  ]);

  await assert.rejects(
    () => runAuthenticatedSmoke({ env, fetchImpl }),
    (error) => {
      assert.match(error.message, /resonance submit failed: 500/i);
      assert.match(error.message, /Cleanup failures:/);
      assert.match(error.message, /share link revoke/i);
      assert.doesNotMatch(error.message, /leaked-access-token|leaked-share-token/);
      return true;
    },
    "cleanup failures should be reported without hiding the original error",
  );

  assert.equal(calls.length, 10, "cleanup still runs after share creation succeeds");
  assert.deepEqual(calls[7].body, { action: "revoke", id: "share-1" }, "share revoke runs in cleanup");
  assert.equal(calls[8].method, "DELETE", "history delete still runs after cleanup failures");
  assert.equal(calls[9].method, "GET", "cleanup verifies the record is gone");
});

console.log("release authenticated smoke helper tests passed");
