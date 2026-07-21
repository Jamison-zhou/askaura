import assert from "node:assert/strict";
import {
  HISTORY_LIMIT,
  historyRecordFromRow,
  historyRecordToRow,
  historyTimestamp,
  mergeHistoryRecords,
  normalizeHistoryRecord
} from "../assets/app/history-store.js";

assert.equal(normalizeHistoryRecord(null), null);
assert.equal(normalizeHistoryRecord("bad"), null);

const normalized = normalizeHistoryRecord({
  id: "record-1",
  mode: "tarot",
  title: "  Title  ",
  question: "  Question  ",
  answer: "  Answer  ",
  actionStatus: "maybe",
  spreadType: "unknown",
  favorite: 1,
  cards: [
    null,
    { orientation: "reversed", imageSrc: "./card.jpg", imageAlt: "Card" },
    { name: "", label: "", imageSrc: "" }
  ],
  followups: [
    null,
    { question: "Q", answer: "A", sourceResultId: "record-1", createdAt: "2026-06-04T01:00:00.000Z" },
    { question: "missing answer", answer: "" }
  ],
  createdAt: "2026-06-04T00:00:00.000Z"
});

assert.equal(normalized.title, "Title");
assert.equal(normalized.question, "Question");
assert.equal(normalized.answer, "Answer");
assert.equal(normalized.actionStatus, "");
assert.equal(normalized.spreadType, "single");
assert.equal(normalized.favorite, true);
assert.equal(normalized.cards.length, 1);
assert.equal(normalized.cards[0].orientation, "reversed");
assert.equal(normalized.followups.length, 1);
assert.equal(normalized.followups[0].sourceResultId, "record-1");

const reflectionRecord = normalizeHistoryRecord({
  id: "reflection-roundtrip",
  mode: "tarot",
  title: "Reflection",
  answer: "Observe first.",
  spreadType: "reflection_triad",
  deckVersion: " reflection-v1 ",
  meaningVersion: " 1.0.0 ",
  cards: [{
    id: " threshold ",
    name: " Threshold ",
    category: "relation",
    coreMeaning: " A boundary is becoming visible. ",
    visibleLine: " The current limit is already noticeable. ",
    hiddenLine: " The unspoken expectation may be adding pressure. ",
    reflectionQuestions: [" What changed? ", "", 42, " What remains true? ", " What is assumed? ", "ignored"],
    actionSeeds: [" Name one boundary. ", null, " Ask one question. ", " Pause once. ", "ignored"],
    prohibitedClaims: [" It is destined. ", "", 42, " They will leave. ", " You must act now. ", " This always works. ", " The answer is certain. ", " Nothing can change. ", "ignored"],
    label: " Relation ",
    position: " relation ",
    orientation: "reversed",
    imageSrc: " ./threshold.webp ",
    imageFallbackSrc: " ./fallback.webp ",
    imageAlt: " Threshold card ",
    deckVersion: " reflection-v1 ",
    meaningVersion: " 1.0.0 ",
  }],
  createdAt: "2026-07-21T00:00:00.000Z",
});

assert.equal(reflectionRecord.deckVersion, "reflection-v1");
assert.equal(reflectionRecord.meaningVersion, "1.0.0");
assert.equal(reflectionRecord.spreadType, "reflection_triad");
assert.deepEqual(reflectionRecord.cards[0], {
  id: "threshold",
  name: "Threshold",
  category: "relation",
  coreMeaning: "A boundary is becoming visible.",
  visibleLine: "The current limit is already noticeable.",
  hiddenLine: "The unspoken expectation may be adding pressure.",
  reflectionQuestions: ["What changed?", "What remains true?", "What is assumed?"],
  actionSeeds: ["Name one boundary.", "Ask one question.", "Pause once."],
  prohibitedClaims: ["It is destined.", "They will leave.", "You must act now.", "This always works.", "The answer is certain.", "Nothing can change."],
  label: "Relation",
  position: "relation",
  imageSrc: "./threshold.webp",
  imageFallbackSrc: "./fallback.webp",
  imageAlt: "Threshold card",
  deckVersion: "reflection-v1",
  meaningVersion: "1.0.0",
});
assert.equal("orientation" in reflectionRecord.cards[0], false);

const invalidReflectionCard = normalizeHistoryRecord({
  id: "invalid-reflection-card",
  cards: [{ id: "card", category: "future", reflectionQuestions: ["", null], actionSeeds: "bad", prohibitedClaims: [] }],
  createdAt: "2026-07-21T00:00:00.000Z",
});
assert.equal(invalidReflectionCard.cards[0].category, "state");
assert.deepEqual(invalidReflectionCard.cards[0].reflectionQuestions, []);
assert.deepEqual(invalidReflectionCard.cards[0].actionSeeds, []);
assert.deepEqual(invalidReflectionCard.cards[0].prohibitedClaims, []);

for (const spreadType of [
  "single",
  "reflection_triad",
  "three_current_resistance_next",
  "relationship_tension",
  "choice_a_b_reminder",
]) {
  assert.equal(normalizeHistoryRecord({ spreadType }).spreadType, spreadType);
}

const existing = [
  { id: "same", mode: "tarot", title: "old", answer: "old", createdAt: "2026-06-04T00:00:00.000Z", updatedAt: "2026-06-04T00:00:00.000Z" },
  { id: "local-new", mode: "daily", title: "local", answer: "local", createdAt: "2026-06-04T02:00:00.000Z" }
];
const incoming = [
  { id: "same", mode: "tarot", title: "new", answer: "new", createdAt: "2026-06-04T00:00:00.000Z", updatedAt: "2026-06-04T03:00:00.000Z" },
  { id: "cloud-new", mode: "meihua", title: "cloud", answer: "cloud", createdAt: "2026-06-04T04:00:00.000Z" }
];
const merged = mergeHistoryRecords(existing, incoming);
assert.deepEqual(merged.map((item) => item.id), ["cloud-new", "same", "local-new"]);
assert.equal(merged.find((item) => item.id === "same").title, "new");

const sameTimestamp = mergeHistoryRecords(
  [{ id: "equal", mode: "tarot", title: "local", answer: "local", createdAt: "2026-06-04T00:00:00.000Z" }],
  [{ id: "equal", mode: "tarot", title: "incoming", answer: "incoming", createdAt: "2026-06-04T00:00:00.000Z" }]
);
assert.equal(sameTimestamp[0].title, "local");

const many = Array.from({ length: HISTORY_LIMIT + 2 }, (_, index) => ({
  id: `r-${index}`,
  mode: "daily",
  title: `Record ${index}`,
  answer: "A",
  createdAt: new Date(Date.UTC(2026, 5, 4, 0, index)).toISOString()
}));
const limited = mergeHistoryRecords([], many);
assert.equal(limited.length, HISTORY_LIMIT);
assert.equal(limited[0].id, `r-${HISTORY_LIMIT + 1}`);
assert.equal(limited.at(-1).id, "r-2");

assert.equal(historyTimestamp({ createdAt: "bad", updatedAt: "2026-06-04T00:00:00.000Z" }), 0);

const roundtripRecord = normalizeHistoryRecord({
  id: "roundtrip",
  mode: "dual",
  title: "Dual",
  question: "Q",
  answer: "A",
  action: "Act",
  actionStatus: "not_fit",
  reviewAt: "2026-06-05T00:00:00.000Z",
  reviewNote: "Review",
  favorite: true,
  spreadType: "relationship_tension",
  imageSrc: "./image.jpg",
  imageAlt: "Image",
  cards: [{ name: "The Star", label: "Self", position: "self", orientation: "reversed", imageSrc: "./star.jpg", imageAlt: "The Star" }],
  gua: { name: "Qian", binary: "111", castMethod: "number", seed: "42" },
  anchor: { color: "blue", object: "cup", moment: "night" },
  followups: [{ id: "f1", question: "FQ", answer: "FA", sourceResultId: "roundtrip", createdAt: "2026-06-04T00:05:00.000Z" }],
  clarificationOf: { sourceResultId: "source", originalQuestion: "OQ", previousCard: "The Moon", resultSummary: "Summary" },
  language: "en",
  createdAt: "2026-06-04T00:00:00.000Z",
  updatedAt: "2026-06-04T00:10:00.000Z"
});

const row = historyRecordToRow(roundtripRecord);
assert.equal(row.action_status, "not_fit");
assert.equal(row.review_at, "2026-06-05T00:00:00.000Z");
assert.equal(row.review_note, "Review");
assert.equal(row.is_favorite, true);
assert.equal(row.spread_type, "relationship_tension");
assert.equal(row.cards[0].orientation, "reversed");
assert.equal(row.gua.seed, "42");
assert.equal(row.anchor.object, "cup");
assert.equal(row.followups[0].answer, "FA");
assert.equal(row.clarification_of.previousCard, "The Moon");
assert.equal(row.language, "en");

const fromRow = historyRecordFromRow(row);
assert.equal(fromRow.id, "roundtrip");
assert.equal(fromRow.actionStatus, "not_fit");
assert.equal(fromRow.reviewAt, "2026-06-05T00:00:00.000Z");
assert.equal(fromRow.favorite, true);
assert.equal(fromRow.spreadType, "relationship_tension");
assert.equal(fromRow.cards[0].position, "self");
assert.equal(fromRow.gua.castMethod, "number");
assert.equal(fromRow.anchor.moment, "night");
assert.equal(fromRow.followups[0].sourceResultId, "roundtrip");
assert.equal(fromRow.clarificationOf.sourceResultId, "source");
assert.equal(fromRow.language, "en");
assert.equal(fromRow.updatedAt, "2026-06-04T00:10:00.000Z");

const reflectionRow = historyRecordToRow(reflectionRecord);
assert.deepEqual(reflectionRow.cards, reflectionRecord.cards);
const reflectionFromRow = historyRecordFromRow({
  ...reflectionRow,
  deckVersion: "do-not-use-row-field",
  meaningVersion: "do-not-use-row-field",
});
assert.deepEqual(reflectionFromRow.cards, reflectionRecord.cards);
assert.equal(reflectionFromRow.deckVersion, "reflection-v1");
assert.equal(reflectionFromRow.meaningVersion, "1.0.0");
assert.equal("orientation" in reflectionFromRow.cards[0], false);

const legacyFromRow = historyRecordFromRow(historyRecordToRow(roundtripRecord));
assert.deepEqual(legacyFromRow.cards[0], {
  name: "The Star",
  label: "Self",
  position: "self",
  orientation: "reversed",
  imageSrc: "./star.jpg",
  imageAlt: "The Star",
});

console.log("history store tests passed");
