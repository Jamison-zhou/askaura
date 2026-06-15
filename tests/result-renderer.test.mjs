import assert from "node:assert/strict";
import {
  actionFromRecord,
  buildActionAdvice,
  cleanTaggedOutputText,
  describeGua,
  hasContextualActionAdvice,
  meihuaReportFromText,
  parseTaggedTokens,
  reportFromRecord
} from "../assets/app/result-renderer.js";

const zhAdvice = buildActionAdvice("", { language: "zh" });
assert.ok(zhAdvice.doText.length > 0);
assert.ok(zhAdvice.dontText.length > 0);
assert.ok(zhAdvice.watchText.length > 0);
assert.doesNotMatch(zhAdvice.dontText + zhAdvice.watchText, /对方|承诺|表态/);

const enAdvice = buildActionAdvice("Take one small step.", { language: "en" });
assert.equal(enAdvice.doText, "Take one small step.");
assert.equal(enAdvice.dontText, "Do not turn this into a bigger decision that must be solved immediately, or escalate while emotion is high.");
assert.equal(enAdvice.watchText, "Next, watch two things: whether this step makes things feel lighter, and whether the next signal becomes clearer.");

const aiAdvice = buildActionAdvice("Order one new dish.", {
  language: "en",
  dontText: "Do not order three meals to compare.",
  watchText: "Notice whether the first bite settles the choice."
});
assert.equal(aiAdvice.dontText, "Do not order three meals to compare.");
assert.equal(aiAdvice.watchText, "Notice whether the first bite settles the choice.");

assert.equal(hasContextualActionAdvice("今晚吃什么呢！"), true);
const foodAdvice = buildActionAdvice("先喝一杯温水，等三分钟，再决定是热汤还是凉拌。", {
  language: "zh",
  questionText: "今晚吃什么呢！",
  dontText: "先不要发长消息、追问承诺，或在情绪最满的时候要求对方立刻表态。",
  watchText: "接下来三天只观察两件事：对方是否给出更清楚的信息。"
});
assert.equal(foodAdvice.doText, "先喝一杯温水，等三分钟，再决定是热汤还是凉拌。");
assert.equal(foodAdvice.dontText, "先不要反复刷菜单，也别一次点太多。");
assert.equal(foodAdvice.watchText, "吃第一口时，观察身体是放松还是更腻。");
assert.doesNotMatch(foodAdvice.dontText + foodAdvice.watchText, /对方|承诺|表态|发长消息/);

assert.deepEqual(parseTaggedTokens("[ACTION] A\nnext\n[JUDGMENT] B"), {
  ACTION: "A\nnext",
  JUDGMENT: "B"
});

assert.equal(
  cleanTaggedOutputText("[THEME] Notice the pattern\n[STUCK_POINT] Stop forcing it\n[NEXT_ACTION] Write one line.", "", {
    preferredOrder: ["THEME", "STUCK_POINT", "NEXT_ACTION"]
  }),
  "Notice the pattern\nStop forcing it\nWrite one line."
);
assert.equal(cleanTaggedOutputText("[TOKEN] Keep the line.", ""), "Keep the line.");

assert.deepEqual(meihuaReportFromText("[GUA_SIGNAL] Slow down.\n[GUA_TREND] Wait for a clearer reply.\n[ACTION] Write one grounded sentence.\n[AVOID] Do not rush.\n[WATCH] Watch your energy."), {
  signal: "Slow down.",
  trend: "Wait for a clearer reply.",
  action: "Write one grounded sentence.",
  avoid: "Do not rush.",
  watch: "Watch your energy."
});

const gua = { name: "宸?", en: "Xun", image: "椋庡叆", essence: "娓愯繘" };
assert.match(describeGua(gua, { language: "zh" }), /椋庡叆/);
assert.equal(describeGua(gua, { language: "en" }), "Xun: 椋庡叆, 娓愯繘.");

const storedReport = reportFromRecord({
  mode: "meihua",
  report: { summary: "Stored", actionText: "Act" }
}, { language: "zh" });
assert.deepEqual(storedReport, { summary: "Stored", actionText: "Act", sourceMode: "meihua" });

const legacyTarot = {
  mode: "tarot",
  answer: "[CORE_QUESTION] What matters?\n[JUDGMENT] Notice the real signal.\n[ACTION] Write one line.\n[AVOID] Do not add noise.\n[WATCH] Watch the first useful signal."
};
assert.equal(actionFromRecord(legacyTarot), "Write one line.");
assert.deepEqual(reportFromRecord(legacyTarot, { language: "en" }), {
  summary: "Notice the real signal.",
  tarotText: "What matters?",
  guaText: "",
  dualText: "",
  actionText: "Write one line.",
  dontText: "Do not add noise.",
  watchText: "Watch the first useful signal.",
  sourceMode: "tarot"
});

const meihuaRecord = {
  mode: "meihua",
  answer: "[GUA_SIGNAL] The signal is hesitation.\n[GUA_TREND] Better to move slower.\n[ACTION] Wait one day before replying.\n[AVOID] Do not force a reply.\n[WATCH] Watch whether pace improves."
};
assert.equal(actionFromRecord(meihuaRecord), "Wait one day before replying.");
assert.deepEqual(reportFromRecord(meihuaRecord, { language: "en" }), {
  summary: "Better to move slower.",
  tarotText: "The signal is hesitation.",
  guaText: "Better to move slower.",
  dualText: "",
  actionText: "Wait one day before replying.",
  dontText: "Do not force a reply.",
  watchText: "Watch whether pace improves.",
  sourceMode: "meihua"
});

const dualReport = reportFromRecord({
  mode: "dual",
  question: "今晚吃什么呢！",
  reading: { tension: "鎯呯华淇″彿" },
  gua
}, { language: "zh" });
assert.equal(dualReport.summary, "");
assert.equal(dualReport.tarotText, "鎯呯华淇″彿");
assert.match(dualReport.guaText, /椋庡叆/);
assert.ok(dualReport.dualText.length > 0);
assert.equal(dualReport.questionText, "今晚吃什么呢！");

assert.equal(reportFromRecord({ mode: "tarot", answer: "" }, { language: "zh" }), null);

console.log("result renderer tests passed");
