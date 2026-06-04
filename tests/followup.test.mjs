import assert from "node:assert/strict";
import {
  appendFollowupToRecord,
  clarificationHistoryText,
  clarificationLinkText,
  clarificationPromptText,
  createClarificationContext,
  createFollowupEntry,
  followupQuestionText,
  followupResultSummary,
  formatStoredFollowups
} from "../assets/app/followup.js";

const labels = {
  push: "What if I move first?",
  avoid: "What should I avoid?",
  blocker: "What is blocking this?",
  review: "How should I review?",
  fallback: "Type your own follow-up"
};

assert.equal(followupQuestionText("push", "", labels), "What if I move first?");
assert.equal(followupQuestionText("custom", "  My question  ", labels), "My question");
assert.equal(followupQuestionText("missing", "", labels), "Type your own follow-up");

assert.equal(followupResultSummary({
  summary: "Summary",
  tarotText: "Tarot",
  guaText: "Gua",
  dualText: "Dual",
  actionText: "Action",
  doText: "Do",
  dontText: "",
  watchText: "Watch"
}), "Summary\nTarot\nGua\nDual\nAction\nDo\nWatch");

const followup = createFollowupEntry({
  question: "Q",
  answer: "A",
  sourceResultId: "r1",
  now: () => "2026-06-04T00:00:00.000Z",
  idFactory: () => "f1"
});
assert.deepEqual(followup, {
  id: "f1",
  question: "Q",
  answer: "A",
  sourceResultId: "r1",
  createdAt: "2026-06-04T00:00:00.000Z"
});

const originalRecord = { id: "r1", followups: [{ id: "old" }], updatedAt: "old-date" };
const updatedRecord = appendFollowupToRecord(originalRecord, followup);
assert.notEqual(updatedRecord, originalRecord);
assert.equal(originalRecord.followups.length, 1);
assert.deepEqual(updatedRecord.followups, [{ id: "old" }, followup]);
assert.equal(updatedRecord.updatedAt, followup.createdAt);
assert.equal(appendFollowupToRecord(null, followup), null);

assert.equal(formatStoredFollowups({
  followups: [
    { question: "Q1", answer: "[TOKEN] A1" },
    { question: "Q2", answer: "A2" }
  ]
}), "Q1\nA1\n\nQ2\nA2");
assert.equal(formatStoredFollowups({ followups: [] }), "");

const clarification = createClarificationContext({
  lastRecord: { id: "r1" },
  lastQuestion: "Original?",
  fallbackQuestion: "Fallback?",
  previousCard: "The Star",
  resultSummary: "Previous summary"
});
assert.deepEqual(clarification, {
  sourceResultId: "r1",
  originalQuestion: "Original?",
  previousCard: "The Star",
  resultSummary: "Previous summary"
});

assert.equal(
  clarificationLinkText(clarification, { language: "zh" }),
  "这是一张澄清牌，回应上一轮「The Star」：Original?"
);
assert.equal(
  clarificationLinkText(clarification, { language: "en" }),
  "This is a clarification card for the previous \"The Star\" result: Original?"
);
assert.equal(clarificationLinkText(null, { language: "zh" }), "");

assert.equal(clarificationHistoryText(clarification), [
  "Clarification of result id: r1",
  "Previous card: The Star",
  "Original question: Original?",
  "Previous result summary: Previous summary"
].join("\n"));

assert.equal(
  clarificationPromptText({ lastQuestion: "Original?", fallbackQuestion: "Fallback?", language: "zh" }),
  "围绕这次结果，抽一张澄清牌：Original?"
);
assert.equal(
  clarificationPromptText({ lastQuestion: "", fallbackQuestion: "Fallback?", language: "en" }),
  "Draw a clarification card for this result: Fallback?"
);

console.log("followup tests passed");
