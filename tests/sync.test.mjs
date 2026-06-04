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
  if (String(url).includes("/rest/v1/askaura_reflection_records") && options.method === "GET") {
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
  if (String(url).includes("/rest/v1/askaura_daily_anchors") && options.method === "GET") {
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
  if (String(url).includes("/rest/v1/askaura_reflection_records") && options.method === "DELETE") {
    return jsonResponse([]);
  }
  if (String(url).includes("/rest/v1/askaura_daily_anchors") && options.method === "DELETE") {
    return jsonResponse([]);
  }
  return jsonResponse([]);
};

const store = createStorage(memoryStorage());
assert.equal(SESSION_KEY, "askaura.authSession.v1");

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
  actionStatus: "not_fit",
  reviewAt: "2026-05-25T08:00:00.000Z",
  reviewNote: "It helped me send a shorter message.",
  favorite: true,
  spreadType: "three_current_resistance_next",
  cards: [{
    name: "The Moon",
    label: "Current",
    position: "current",
    orientation: "upright",
    imageSrc: "./assets/cards/18-the-moon.jpg",
    imageAlt: "The Moon",
  }],
  followups: [{
    id: "followup-local-1",
    question: "Follow-up question",
    answer: "Follow-up answer",
    sourceResultId: "local-1",
    createdAt: "2026-05-22T08:05:00.000Z",
  }],
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
  actionStatus: "not_fit",
  reviewAt: "2026-05-25T01:00:00.000Z",
  reviewNote: "The action reduced pressure.",
  favorite: true,
  spreadType: "relationship_tension",
  cards: [{
    name: "The Star",
    label: "Self",
    position: "self",
    orientation: "reversed",
    imageSrc: "./assets/cards/17-the-star.jpg",
    imageAlt: "The Star",
  }],
  followups: [{
    id: "followup-roundtrip",
    question: "What else?",
    answer: "Check one signal.",
    sourceResultId: "roundtrip",
    createdAt: "2026-05-22T01:05:00.000Z",
  }],
  clarificationOf: {
    sourceResultId: "source-roundtrip",
    originalQuestion: "Original question",
    previousCard: "The Moon",
    resultSummary: "Original summary",
  },
  gua: {
    name: "Qian",
    binary: "111",
    castMethod: "character",
    seed: "问",
  },
  createdAt: "2026-05-22T01:00:00.000Z",
});

assert.equal(row.created_at, "2026-05-22T01:00:00.000Z");
assert.equal(historyRecordFromRow(row).createdAt, row.created_at);
assert.equal(row.action_status, "not_fit");
assert.equal(historyRecordFromRow(row).actionStatus, "not_fit");
assert.equal(row.review_at, "2026-05-25T01:00:00.000Z");
assert.equal(row.review_note, "The action reduced pressure.");
assert.equal(historyRecordFromRow(row).reviewAt, "2026-05-25T01:00:00.000Z");
assert.equal(historyRecordFromRow(row).reviewNote, "The action reduced pressure.");
assert.equal(row.is_favorite, true);
assert.equal(historyRecordFromRow(row).favorite, true);
assert.equal(row.spread_type, "relationship_tension");
assert.equal(historyRecordFromRow(row).spreadType, "relationship_tension");
assert.equal(row.cards[0].position, "self");
assert.equal(historyRecordFromRow(row).cards[0].orientation, "reversed");
assert.equal(row.gua.castMethod, "character");
assert.equal(historyRecordFromRow(row).gua.seed, "问");
assert.equal(row.followups[0].sourceResultId, "roundtrip");
assert.equal(historyRecordFromRow(row).followups[0].answer, "Check one signal.");
assert.equal(row.clarification_of.previousCard, "The Moon");
assert.equal(historyRecordFromRow(row).clarificationOf.sourceResultId, "source-roundtrip");

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

assert.ok(calls.every((call) => !String(call.url).includes("rill_reflection_records")));
assert.ok(calls.every((call) => !String(call.url).includes("rill_daily_anchors")));
assert.ok(calls.every((call) => !String(call.url).includes("icvegpfnpkyrebtojoca")));

const defaultCalls = [];
globalThis.ASKAURA_SUPABASE_URL = "https://askaura-example.supabase.co/";
globalThis.ASKAURA_SUPABASE_ANON_KEY = "askaura-anon";
const defaultClient = createSyncClient({
  fetchImpl: async (url, options = {}) => {
    defaultCalls.push({ url, options });
    return jsonResponse({
      access_token: "default-access",
      refresh_token: "default-refresh",
      user: { id: "default-user", email: "default@example.com" },
    });
  },
  store: createStorage(memoryStorage()),
});

await defaultClient.signInWithPassword("default@example.com", "secret-pass");
assert.equal(String(defaultCalls[0].url), "https://askaura-example.supabase.co/auth/v1/token?grant_type=password");
assert.equal(defaultCalls[0].options.headers.apikey, "askaura-anon");

console.log("sync tests passed");
