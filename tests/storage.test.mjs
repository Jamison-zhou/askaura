import assert from "node:assert/strict";

import {
  HISTORY_LIMIT,
  clearDailyAnchors,
  clearHistory,
  createStorage,
  loadDailyAnchor,
  loadHistory,
  mergeHistory,
  saveDailyAnchor,
  saveHistoryRecord,
  todayKey,
} from "../assets/app/storage.js";

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

const store = createStorage(memoryStorage());

assert.equal(todayKey(new Date("2026-05-22T08:30:00+08:00")), "2026-05-22");
assert.deepEqual(loadHistory(store), []);

const first = saveHistoryRecord(store, {
  id: "record-1",
  mode: "tarot",
  title: "塔罗 · 月亮",
  question: "我现在需要看见什么？",
  answer: "先把灯打开。",
  reading: { coreQuestion: "真正的问题", tension: "张力", judgment: "判断" },
  report: { summary: "摘要", tarotText: "依据", actionText: "行动" },
  gua: { name: "乾", binary: "111111" },
  createdAt: "2026-05-22T08:00:00.000Z",
});

assert.equal(first.length, 1);
assert.equal(first[0].id, "record-1");
assert.equal(first[0].reading.coreQuestion, "真正的问题");
assert.equal(first[0].report.summary, "摘要");
assert.equal(first[0].gua.binary, "111111");

const deduped = saveHistoryRecord(store, {
  id: "record-1",
  mode: "tarot",
  title: "塔罗 · 月亮",
  question: "更新的问题",
  answer: "更新后的回应。",
  createdAt: "2026-05-22T09:00:00.000Z",
});

assert.equal(deduped.length, 1);
assert.equal(deduped[0].question, "更新的问题");

for (let index = 0; index < HISTORY_LIMIT + 3; index += 1) {
  saveHistoryRecord(store, {
    id: `record-${index + 2}`,
    mode: "daily",
    title: `当下 · ${index}`,
    answer: `第 ${index} 条`,
    createdAt: new Date(Date.UTC(2026, 4, 22, 10, index)).toISOString(),
  });
}

const limited = loadHistory(store);
assert.equal(limited.length, HISTORY_LIMIT);
assert.equal(limited[0].id, `record-${HISTORY_LIMIT + 4}`);
assert.equal(limited.at(-1).id, "record-5");

const merged = mergeHistory(store, [
  {
    id: "cloud-newer",
    mode: "meihua",
    title: "梅花 · 震",
    answer: "先发一条确认消息。",
    createdAt: "2026-05-23T01:00:00.000Z",
  },
  {
    id: limited[0].id,
    mode: "daily",
    title: "重复项",
    answer: "云端重复不应新增。",
    createdAt: limited[0].createdAt,
  },
]);

assert.equal(merged[0].id, "cloud-newer");
assert.equal(new Set(merged.map((item) => item.id)).size, merged.length);
assert.equal(merged.length, HISTORY_LIMIT);

const anchorDate = "2026-05-22";
assert.equal(loadDailyAnchor(store, anchorDate), null);

const savedAnchor = saveDailyAnchor(store, anchorDate, {
  id: "anchor-1",
  mode: "daily",
  title: "当下 · 节制",
  answer: "今天只做一个小动作。",
  createdAt: "2026-05-22T00:10:00.000Z",
});

assert.equal(loadDailyAnchor(store, anchorDate).id, savedAnchor.id);
assert.equal(loadDailyAnchor(store, "2026-05-23"), null);

clearHistory(store);
assert.deepEqual(loadHistory(store), []);
assert.equal(loadDailyAnchor(store, anchorDate).id, savedAnchor.id);

clearDailyAnchors(store);
assert.equal(loadDailyAnchor(store, anchorDate), null);

console.log("storage tests passed");
