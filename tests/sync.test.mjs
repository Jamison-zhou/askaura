import assert from "node:assert/strict";

import { createStorage, loadHistory, saveHistoryRecord } from "../assets/app/storage.js";
import {
  SESSION_KEY,
  createSyncClient,
  historyRecordFromRow,
  historyRecordToRow,
} from "../assets/app/sync.js";

function memoryStorage(seed = {}) {
  const state = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    },
  };
}

function jsonResponse(body, ok = true) {
  return {
    ok,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

const calls = [];
const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options });
  if (String(url).includes("/auth/v1/signup")) {
    const body = JSON.parse(options.body);
    if (body.email === "exists@example.com") {
      return jsonResponse({ message: "User already registered" }, false);
    }
    return jsonResponse({
      user: { id: "new-user", email: body.email },
    });
  }
  if (String(url).includes("/auth/v1/user") && options.method === "GET") {
    return jsonResponse({ id: "confirmed-user", email: "confirmed@example.com" });
  }
  if (String(url).includes("/auth/v1/user") && options.method === "PUT") {
    return jsonResponse({ id: "confirmed-user", email: "confirmed@example.com", updated: true });
  }
  if (String(url).includes("/auth/v1/recover")) {
    return jsonResponse({});
  }
  if (String(url).includes("/auth/v1/token")) {
    const body = JSON.parse(options.body);
    if (String(url).includes("grant_type=refresh_token")) {
      return jsonResponse({
        access_token: "refreshed-access",
        refresh_token: "refreshed-refresh",
        expires_in: 3600,
        user: { id: "user-1", email: "test@example.com" },
      });
    }
    if (body.email === "unconfirmed@example.com") {
      return jsonResponse({ message: "Email not confirmed" }, false);
    }
    return jsonResponse({
      access_token: "access-123",
      refresh_token: "refresh-123",
      user: { id: "user-1", email: "test@example.com" },
    });
  }
  if (String(url).includes("/rest/v1/rill_reflection_records") && options.method === "GET") {
    return jsonResponse([
      historyRecordToRow({
        id: "cloud-1",
        mode: "daily",
        title: "当下 · 节制",
        answer: "云端记录",
        action: "云端记录",
        createdAt: "2026-05-23T01:00:00.000Z",
        updatedAt: "2026-05-23T01:00:00.000Z",
      }),
    ]);
  }
  if (String(url).includes("/rest/v1/rill_daily_anchors") && options.method === "GET") {
    return jsonResponse([
      {
        date_key: "2026-05-23",
        record_id: "cloud-anchor",
        record: historyRecordToRow({
          id: "cloud-anchor",
          mode: "daily",
          title: "当下 · 月亮",
          answer: "云端今日锚点",
          action: "云端今日锚点",
          anchor: { color: "蓝", object: "杯子", moment: "睡前" },
          createdAt: "2026-05-23T00:10:00.000Z",
          updatedAt: "2026-05-23T00:10:00.000Z",
        }),
      },
    ]);
  }
  if (String(url).includes("/rest/v1/rill_reflection_records") && options.method === "DELETE") {
    return jsonResponse([]);
  }
  if (String(url).includes("/rest/v1/rill_daily_anchors") && options.method === "DELETE") {
    return jsonResponse([]);
  }
  return jsonResponse([]);
};

const store = createStorage(memoryStorage());
const client = createSyncClient({
  supabaseUrl: "https://example.supabase.co/",
  anonKey: "anon-key",
  fetchImpl,
  store,
});

const signedOutSync = await client.syncHistory();
assert.equal(signedOutSync.status, "signed-out");

const pendingSignup = await client.signUpWithPassword("new@example.com", "secret-pass");
assert.equal(pendingSignup.status, "pending");
assert.equal(pendingSignup.user.email, "new@example.com");
assert.equal(store.get(SESSION_KEY, null), null);

await assert.rejects(
  () => client.signUpWithPassword("exists@example.com", "secret-pass"),
  /User already registered/,
);

await assert.rejects(
  () => client.signInWithPassword("unconfirmed@example.com", "secret-pass"),
  /Email not confirmed/,
);

const session = await client.signInWithPassword("test@example.com", "secret-pass");
assert.equal(session.access_token, "access-123");
assert.equal(store.get(SESSION_KEY, null).user.email, "test@example.com");

const authCall = calls.find((call) => (
  String(call.url).includes("/auth/v1/token")
  && JSON.parse(call.options.body).email === "test@example.com"
));
assert.equal(authCall.url, "https://example.supabase.co/auth/v1/token?grant_type=password");
assert.equal(authCall.options.headers.apikey, "anon-key");
assert.equal(authCall.options.headers.Authorization, "Bearer anon-key");
assert.deepEqual(JSON.parse(authCall.options.body), {
  email: "test@example.com",
  password: "secret-pass",
});

saveHistoryRecord(store, {
  id: "local-1",
  mode: "tarot",
  title: "塔罗 · 月亮",
  question: "我需要看见什么？",
  answer: "本地记录",
  action: "本地记录",
  imageSrc: "./assets/cards/18-the-moon.jpg",
  imageAlt: "月亮",
  createdAt: "2026-05-22T08:00:00.000Z",
  updatedAt: "2026-05-22T08:00:00.000Z",
});

const synced = await client.syncHistory();
assert.equal(synced.status, "synced");
assert.equal(synced.records.length, 2);
assert.equal(loadHistory(store)[0].id, "cloud-1");

const postCall = calls.find((call) => String(call.url).includes("on_conflict=id"));
assert.ok(postCall);
assert.equal(postCall.options.headers.Authorization, "Bearer access-123");
assert.equal(postCall.options.headers.Prefer, "resolution=merge-duplicates");
assert.equal(JSON.parse(postCall.options.body).length, 2);

const row = historyRecordToRow({
  id: "roundtrip",
  mode: "meihua",
  title: "梅花 · 震",
  question: "下一步？",
  answer: "先确认一件事。",
  createdAt: "2026-05-22T01:00:00.000Z",
});

assert.equal(row.created_at, "2026-05-22T01:00:00.000Z");
assert.equal(historyRecordFromRow(row).createdAt, row.created_at);

const cloudAnchor = await client.loadDailyAnchor("2026-05-23");
assert.equal(cloudAnchor.status, "synced");
assert.equal(cloudAnchor.record.id, "cloud-anchor");

const clearResult = await client.clearCloudRecords();
assert.equal(clearResult.status, "synced");
const deleteCalls = calls.filter((call) => call.options.method === "DELETE");
assert.equal(deleteCalls.length, 2);
assert.ok(deleteCalls.every((call) => call.options.headers.Authorization === "Bearer access-123"));

const confirmed = await client.completeSessionFromUrl("http://127.0.0.1:4173/#access_token=confirmed-token&refresh_token=confirmed-refresh&expires_in=3600&token_type=bearer&type=signup");
assert.equal(confirmed.status, "signed-in");
assert.equal(store.get(SESSION_KEY, null).access_token, "confirmed-token");
assert.equal(store.get(SESSION_KEY, null).user.email, "confirmed@example.com");

const codeOnly = await client.completeSessionFromUrl("http://127.0.0.1:4173/?code=abc123");
assert.equal(codeOnly.status, "needs-login");

await assert.rejects(
  () => client.completeSessionFromUrl("http://127.0.0.1:4173/#error_description=Email%20link%20is%20invalid"),
  /Email link is invalid/,
);

const reset = await client.requestPasswordReset("reset@example.com", "http://127.0.0.1:4173/");
assert.equal(reset.status, "sent");
const resetCall = calls.find((call) => String(call.url).includes("/auth/v1/recover"));
assert.ok(String(resetCall.url).includes("redirect_to=http%3A%2F%2F127.0.0.1%3A4173%2F"));

const updated = await client.updatePassword("new-secret");
assert.equal(updated.status, "updated");
const updateCall = calls.find((call) => String(call.url).includes("/auth/v1/user") && call.options.method === "PUT");
assert.equal(updateCall.options.headers.Authorization, "Bearer confirmed-token");
assert.deepEqual(JSON.parse(updateCall.options.body), { password: "new-secret" });

store.set(SESSION_KEY, {
  access_token: "expired-access",
  refresh_token: "refresh-me",
  expires_at: 1,
  user: { id: "user-1", email: "test@example.com" },
});

const refreshedSync = await client.syncHistory();
assert.equal(refreshedSync.status, "synced");
assert.equal(store.get(SESSION_KEY, null).access_token, "refreshed-access");

const refreshCall = calls.find((call) => String(call.url).includes("grant_type=refresh_token"));
assert.ok(refreshCall);
assert.deepEqual(JSON.parse(refreshCall.options.body), { refresh_token: "refresh-me" });

console.log("sync tests passed");
