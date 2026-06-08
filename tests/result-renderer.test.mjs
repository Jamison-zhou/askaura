import assert from "node:assert/strict";
import {
  actionFromRecord,
  buildActionAdvice,
  cleanTaggedOutputText,
  describeGua,
  meihuaReportFromText,
  parseTaggedTokens,
  reportFromRecord
} from "../assets/app/result-renderer.js";

const zhAdvice = buildActionAdvice("", { language: "zh" });
assert.ok(zhAdvice.doText.length > 0);
assert.ok(zhAdvice.dontText.length > 0);
assert.ok(zhAdvice.watchText.length > 0);

const enAdvice = buildActionAdvice("Take one small step.", { language: "en" });
assert.equal(enAdvice.doText, "Take one small step.");
assert.equal(enAdvice.dontText, "Do not send a long message, ask for a promise, or demand an immediate answer while emotion is high.");
assert.equal(enAdvice.watchText, "For three days, watch two things: whether clearer information appears, and whether your own friction goes down.");

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

assert.deepEqual(meihuaReportFromText("[GUA_SIGNAL] Slow down.\n[GUA_TREND] Wait for a clearer reply.\n[ACTION] Write one grounded sentence."), {
  signal: "Slow down.",
  trend: "Wait for a clearer reply.",
  action: "Write one grounded sentence."
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

const meihuaRecord = {
  mode: "meihua",
  answer: "[GUA_SIGNAL] The signal is hesitation.\n[GUA_TREND] Better to move slower.\n[ACTION] Wait one day before replying."
};
assert.equal(actionFromRecord(meihuaRecord), "Wait one day before replying.");
assert.deepEqual(reportFromRecord(meihuaRecord, { language: "en" }), {
  summary: "Better to move slower.",
  tarotText: "The signal is hesitation.",
  guaText: "Better to move slower.",
  dualText: "",
  actionText: "Wait one day before replying.",
  sourceMode: "meihua"
});

const dualReport = reportFromRecord({
  mode: "dual",
  reading: { tension: "鎯呯华淇″彿" },
  gua
}, { language: "zh" });
assert.equal(dualReport.summary, "");
assert.equal(dualReport.tarotText, "鎯呯华淇″彿");
assert.match(dualReport.guaText, /椋庡叆/);
assert.ok(dualReport.dualText.length > 0);

assert.equal(reportFromRecord({ mode: "tarot", answer: "" }, { language: "zh" }), null);

console.log("result renderer tests passed");
