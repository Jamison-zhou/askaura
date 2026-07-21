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

const followupStore = createStorage(memoryStorage());
saveHistoryRecord(followupStore, {
  id: "followup-record",
  mode: "tarot",
  title: "Followup source",
  question: "Original question",
  answer: "Original answer",
  actionStatus: "done",
  reviewAt: "2026-05-25T08:00:00.000Z",
  reviewNote: "It helped me wait before replying.",
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
  createdAt: "2026-05-22T08:00:00.000Z",
  updatedAt: "2026-05-22T08:00:00.000Z",
});
const followupUpdated = saveHistoryRecord(followupStore, {
  id: "followup-record",
  mode: "tarot",
  title: "Followup source",
  question: "Original question",
  answer: "Original answer",
  actionStatus: "done",
  reviewAt: "2026-05-25T08:00:00.000Z",
  reviewNote: "It helped me wait before replying.",
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
    question: "Follow-up question",
    answer: "Follow-up answer",
    sourceResultId: "followup-record",
    createdAt: "2026-05-22T08:05:00.000Z",
  }],
  createdAt: "2026-05-22T08:00:00.000Z",
  updatedAt: "2026-05-22T08:05:00.000Z",
});
assert.equal(followupUpdated.length, 1);
assert.equal(followupUpdated[0].followups.length, 1);
assert.equal(followupUpdated[0].followups[0].sourceResultId, "followup-record");
assert.equal(loadHistory(followupStore)[0].followups[0].answer, "Follow-up answer");
assert.equal(loadHistory(followupStore)[0].actionStatus, "done");
assert.equal(loadHistory(followupStore)[0].reviewAt, "2026-05-25T08:00:00.000Z");
assert.equal(loadHistory(followupStore)[0].reviewNote, "It helped me wait before replying.");
assert.equal(loadHistory(followupStore)[0].favorite, true);
assert.equal(loadHistory(followupStore)[0].spreadType, "three_current_resistance_next");
assert.equal(loadHistory(followupStore)[0].cards[0].position, "current");

const reflectionStore = createStorage(memoryStorage());
saveHistoryRecord(reflectionStore, {
  id: "reflection-record",
  mode: "tarot",
  title: "Reflection",
  answer: "Check the observable facts.",
  spreadType: "reflection_triad",
  deckVersion: "reflection-v1",
  meaningVersion: "1.0.0",
  cards: [{
    id: "threshold",
    name: "Threshold",
    category: "movement",
    coreMeaning: "A limit is changing.",
    visibleLine: "The old pace no longer fits.",
    hiddenLine: "A smaller step may be enough.",
    reflectionQuestions: ["What is changing?"],
    actionSeeds: ["Reduce one commitment."],
    prohibitedClaims: ["Change is guaranteed."],
    label: "Movement",
    position: "movement",
    imageSrc: "./threshold.webp",
    imageFallbackSrc: "./fallback.webp",
    imageAlt: "Threshold",
    deckVersion: "reflection-v1",
    meaningVersion: "1.0.0",
  }],
  createdAt: "2026-07-21T00:00:00.000Z",
});
const persistedReflection = loadHistory(reflectionStore)[0];
assert.equal(persistedReflection.spreadType, "reflection_triad");
assert.equal(persistedReflection.deckVersion, "reflection-v1");
assert.equal(persistedReflection.meaningVersion, "1.0.0");
assert.equal(persistedReflection.cards[0].coreMeaning, "A limit is changing.");
assert.deepEqual(persistedReflection.cards[0].prohibitedClaims, ["Change is guaranteed."]);
assert.equal("orientation" in persistedReflection.cards[0], false);

const persistedLegacy = loadHistory(followupStore)[0].cards[0];
assert.equal(persistedLegacy.orientation, "upright");
assert.equal(persistedLegacy.imageSrc, "./assets/cards/18-the-moon.jpg");

const invalidStatus = saveHistoryRecord(createStorage(memoryStorage()), {
  id: "invalid-status",
  mode: "tarot",
  title: "Invalid status",
  answer: "Action",
  actionStatus: "maybe",
  createdAt: "2026-05-22T08:00:00.000Z",
});
assert.equal(invalidStatus[0].actionStatus, "");

const clarificationStore = createStorage(memoryStorage());
const clarificationRecords = saveHistoryRecord(clarificationStore, {
  id: "clarification-record",
  mode: "tarot",
  title: "Clarification card",
  question: "Clarify this result",
  answer: "Clarification answer",
  clarificationOf: {
    sourceResultId: "followup-record",
    originalQuestion: "Original question",
    previousCard: "The Moon",
    resultSummary: "Original summary",
  },
  gua: {
    name: "Qian",
    binary: "111",
    castMethod: "number",
    seed: "42",
  },
  createdAt: "2026-05-22T08:10:00.000Z",
});
assert.equal(clarificationRecords[0].clarificationOf.sourceResultId, "followup-record");
assert.equal(loadHistory(clarificationStore)[0].clarificationOf.previousCard, "The Moon");
assert.equal(loadHistory(clarificationStore)[0].gua.castMethod, "number");

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

const legacyHistoryState = {
  "rill.history.v1": JSON.stringify([{
    id: "legacy-1",
    mode: "tarot",
    title: "Legacy",
    answer: "Legacy record",
    createdAt: "2026-05-21T01:00:00.000Z",
  }]),
};
const legacyHistoryStore = createStorage(memoryStorage(legacyHistoryState));
assert.equal(loadHistory(legacyHistoryStore)[0].id, "legacy-1");
saveHistoryRecord(legacyHistoryStore, {
  id: "new-1",
  mode: "tarot",
  title: "AskAura",
  answer: "New record",
  createdAt: "2026-05-22T01:00:00.000Z",
});
assert.equal(legacyHistoryStore.has("askaura.history.v1"), true);
assert.equal(legacyHistoryStore.has("rill.history.v1"), true);
clearHistory(legacyHistoryStore);
assert.deepEqual(loadHistory(legacyHistoryStore), []);
assert.equal(legacyHistoryStore.has("rill.history.v1"), true);

const legacyAnchorDate = "2026-05-21";
const legacyDailyStore = createStorage(memoryStorage({
  "rill.dailyAnchors.v1": JSON.stringify({
    [legacyAnchorDate]: {
      id: "legacy-anchor",
      mode: "daily",
      title: "Legacy anchor",
      answer: "Legacy anchor record",
      createdAt: "2026-05-21T01:00:00.000Z",
    },
  }),
}));
assert.equal(loadDailyAnchor(legacyDailyStore, legacyAnchorDate).id, "legacy-anchor");
saveDailyAnchor(legacyDailyStore, legacyAnchorDate, {
  id: "new-anchor",
  mode: "daily",
  title: "AskAura anchor",
  answer: "New anchor record",
  createdAt: "2026-05-22T01:00:00.000Z",
});
assert.equal(legacyDailyStore.has("askaura.dailyAnchors.v1"), true);
assert.equal(legacyDailyStore.has("rill.dailyAnchors.v1"), true);
clearDailyAnchors(legacyDailyStore);
assert.equal(loadDailyAnchor(legacyDailyStore, legacyAnchorDate), null);
assert.equal(legacyDailyStore.has("rill.dailyAnchors.v1"), true);

console.log("storage tests passed");
