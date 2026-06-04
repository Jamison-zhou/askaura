import assert from "node:assert/strict";
import {
  actionFromRecord,
  buildActionAdvice,
  describeGua,
  parseTaggedTokens,
  reportFromRecord
} from "../assets/app/result-renderer.js";

const zhAdvice = buildActionAdvice("", { language: "zh" });
assert.equal(zhAdvice.doText, "用三句话写下已知事实、你的猜测、今天能做的一个小动作。");
assert.equal(zhAdvice.dontText, "先不要发长消息、追问承诺，或在情绪最满的时候要求对方立刻表态。");
assert.equal(zhAdvice.watchText, "接下来三天只观察两件事：对方是否给出更清楚的信息，以及你自己的消耗有没有下降。");

const enAdvice = buildActionAdvice("Take one small step.", { language: "en" });
assert.equal(enAdvice.doText, "Take one small step.");
assert.equal(enAdvice.dontText, "Do not send a long message, ask for a promise, or demand an immediate answer while emotion is high.");
assert.equal(enAdvice.watchText, "For three days, watch two things: whether clearer information appears, and whether your own friction goes down.");

assert.deepEqual(parseTaggedTokens("[ACTION] A\nnext\n[JUDGMENT] B"), {
  ACTION: "A\nnext",
  JUDGMENT: "B"
});

const gua = { name: "巽", en: "Xun", image: "风入", essence: "渐进" };
assert.equal(describeGua(gua, { language: "zh" }), "巽：风入，渐进。");
assert.equal(describeGua(gua, { language: "en" }), "Xun: 风入, 渐进.");

const storedReport = reportFromRecord({
  mode: "meihua",
  report: { summary: "Stored", actionText: "Act" }
}, { language: "zh" });
assert.deepEqual(storedReport, { summary: "Stored", actionText: "Act", sourceMode: "meihua" });

const legacyTarot = {
  mode: "tarot",
  answer: "[CORE_QUESTION] What matters?\n[JUDGMENT] Notice the real signal.\n[ACTION] Write one line."
};
assert.equal(actionFromRecord(legacyTarot), "Write one line.");
assert.deepEqual(reportFromRecord(legacyTarot, { language: "en" }), {
  summary: "Notice the real signal.",
  tarotText: "What matters?",
  guaText: "",
  dualText: "",
  actionText: "Write one line.",
  sourceMode: "tarot"
});

const dualReport = reportFromRecord({
  mode: "dual",
  reading: { tension: "情绪信号" },
  gua
}, { language: "zh" });
assert.equal(dualReport.summary, "");
assert.equal(dualReport.tarotText, "情绪信号");
assert.equal(dualReport.guaText, "巽：风入，渐进。");
assert.equal(dualReport.dualText, "牌象和卦象共同提醒你：先把情绪信号与推进节奏分开看，再决定下一步。");

assert.equal(reportFromRecord({ mode: "tarot", answer: "" }, { language: "zh" }), null);

console.log("result renderer tests passed");
