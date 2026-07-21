import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modules = {
  reading: pathToFileURL(resolve("supabase/functions/_shared/prompts/reading.ts")).href,
  meihua: pathToFileURL(resolve("supabase/functions/_shared/prompts/meihua.ts")).href,
  advice: pathToFileURL(resolve("supabase/functions/_shared/prompts/advice.ts")).href,
  anchor: pathToFileURL(resolve("supabase/functions/_shared/prompts/anchor.ts")).href,
  clarify: pathToFileURL(resolve("supabase/functions/_shared/prompts/clarify.ts")).href,
  followup: pathToFileURL(resolve("supabase/functions/_shared/prompts/followup.ts")).href,
};

function runTsScript(script) {
  let node = process.execPath;
  if (!process.allowedNodeEnvironmentFlags.has("--experimental-strip-types")) {
    const voltaImages = resolve(homedir(), "AppData/Local/Volta/tools/image/node");
    const compatible = existsSync(voltaImages)
      ? readdirSync(voltaImages)
        .filter((version) => Number(version.split(".")[0]) >= 22)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0]
      : "";
    if (compatible) node = resolve(voltaImages, compatible, "node.exe");
  }
  return execFileSync(
    node,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    { encoding: "utf8" },
  ).trim();
}

const prompts = JSON.parse(runTsScript(`
  const out = {};
  out.reading = (await import(${JSON.stringify(modules.reading)})).buildReadingPrompt({
    mode: "reading",
    deckVersion: "reflection-v1",
    cardName: "DYNAMIC_READING_CARD",
    spreadType: "single",
    cards: [{
      id: "state-dynamic-card",
      category: "state",
      name: "DYNAMIC_READING_CARD",
      label: "DYNAMIC_READING_LABEL",
      position: "single",
      coreMeaning: "DYNAMIC_READING_CORE",
      visibleLine: "DYNAMIC_READING_VISIBLE",
      hiddenLine: "DYNAMIC_READING_HIDDEN",
      reflectionQuestions: ["DYNAMIC_READING_VERIFY"],
      actionSeeds: ["DYNAMIC_READING_ACTION"],
      prohibitedClaims: ["DYNAMIC_READING_PROHIBITED"],
      meaningVersion: "1.0.0",
    }],
    intent: "clarity",
    question: "DYNAMIC_READING_QUESTION",
    round: 1,
    sessionHistory: "DYNAMIC_READING_HISTORY",
    language: "en",
  });
  out.readingAlternate = (await import(${JSON.stringify(modules.reading)})).buildReadingPrompt({
    mode: "reading",
    deckVersion: "reflection-v1",
    cardName: "ALTERNATE_READING_CARD",
    spreadType: "single",
    cards: [{
      id: "movement-alternate-card",
      category: "movement",
      name: "ALTERNATE_READING_CARD",
      label: "ALTERNATE_READING_LABEL",
      position: "single",
      coreMeaning: "ALTERNATE_READING_CORE",
      visibleLine: "ALTERNATE_READING_VISIBLE",
      hiddenLine: "ALTERNATE_READING_HIDDEN",
      reflectionQuestions: ["ALTERNATE_READING_VERIFY"],
      actionSeeds: ["ALTERNATE_READING_ACTION"],
      prohibitedClaims: ["ALTERNATE_READING_PROHIBITED"],
      meaningVersion: "1.0.0",
    }],
    intent: "clarity",
    question: "ALTERNATE_READING_QUESTION",
    round: 1,
    sessionHistory: "ALTERNATE_READING_HISTORY",
    language: "en",
  });
  out.meihua = (await import(${JSON.stringify(modules.meihua)})).buildMeihuaPrompt({
    mode: "meihua-reading",
    guaName: "乾",
    intent: "clarity",
    question: "DYNAMIC_MEIHUA_QUESTION",
    language: "en",
  });
  out.advice = (await import(${JSON.stringify(modules.advice)})).buildAdvicePrompt({
    mode: "advice",
    cardName: "The Star",
    orientation: "upright",
    intent: "support",
    question: "DYNAMIC_ADVICE_QUESTION",
    sessionSummary: "DYNAMIC_ADVICE_SUMMARY",
    language: "en",
  });
  out.anchor = (await import(${JSON.stringify(modules.anchor)})).buildAnchorPrompt({
    mode: "anchor",
    cardName: "Temperance",
    orientation: "upright",
    language: "en",
  });
  out.clarify = (await import(${JSON.stringify(modules.clarify)})).buildClarifyPrompt({
    mode: "clarify",
    question: "DYNAMIC_CLARIFY_QUESTION",
    language: "en",
  });
  out.followup = (await import(${JSON.stringify(modules.followup)})).buildFollowupPrompt({
    mode: "followup",
    originalQuestion: "DYNAMIC_FOLLOWUP_ORIGINAL",
    resultSummary: "DYNAMIC_FOLLOWUP_SUMMARY",
    followupQuestion: "DYNAMIC_FOLLOWUP_QUESTION",
    language: "en",
  });
  console.log(JSON.stringify(out));
`));

function assertDynamicContextLast(name, prompt, dynamicMarkers, stableMarkers = []) {
  const contextIndex = prompt.indexOf("Dynamic context:");
  assert.ok(contextIndex > 0, `${name} prompt declares Dynamic context`);
  for (const marker of stableMarkers) {
    assert.ok(prompt.indexOf(marker) >= 0, `${name} prompt contains stable marker ${marker}`);
    assert.ok(prompt.indexOf(marker) < contextIndex, `${name} stable marker ${marker} stays before dynamic context`);
  }
  for (const marker of dynamicMarkers) {
    const markerIndex = prompt.indexOf(marker);
    assert.ok(markerIndex > contextIndex, `${name} dynamic marker ${marker} appears after Dynamic context`);
  }
}

assertDynamicContextLast("reading", prompts.reading, ["DYNAMIC_READING_QUESTION", "DYNAMIC_READING_HISTORY", "DYNAMIC_READING_CARD", "DYNAMIC_READING_CORE"], ["[REFLECTION]", "[HIDDEN]", "[VERIFY]", "[ACTION]"]);
const readingContextIndex = prompts.reading.indexOf("Dynamic context:");
const readingStablePrefix = prompts.reading.slice(0, readingContextIndex);
const alternateReadingContextIndex = prompts.readingAlternate.indexOf("Dynamic context:");
assert.equal(
  readingStablePrefix,
  prompts.readingAlternate.slice(0, alternateReadingContextIndex),
  "reading stable prefix is identical across different questions and cards",
);
for (const marker of ["DYNAMIC_READING_QUESTION", "DYNAMIC_READING_HISTORY", "DYNAMIC_READING_CARD", "DYNAMIC_READING_LABEL", "DYNAMIC_READING_CORE"]) {
  assert.doesNotMatch(readingStablePrefix, new RegExp(marker), `reading stable prefix excludes ${marker}`);
}
assert.match(prompts.reading.slice(readingContextIndex), /<DYNAMIC_CONTEXT>[\s\S]*<QUESTION>DYNAMIC_READING_QUESTION<\/QUESTION>[\s\S]*<CARD_1>/, "reading dynamic values stay in the delimited tail");
assertDynamicContextLast("meihua", prompts.meihua, ["DYNAMIC_MEIHUA_QUESTION"], ["[GUA_SIGNAL]", "[GUA_TREND]", "[ACTION]", "[AVOID]", "[WATCH]"]);
assertDynamicContextLast("advice", prompts.advice, ["DYNAMIC_ADVICE_QUESTION", "DYNAMIC_ADVICE_SUMMARY"], ["[ACTION]"]);
assertDynamicContextLast("anchor", prompts.anchor, ["Temperance"], ["[ANCHOR_CORE]", "[ANCHOR_TAKEAWAY]"]);
assertDynamicContextLast("clarify", prompts.clarify, ["DYNAMIC_CLARIFY_QUESTION"], ["[CLARIFIED_QUESTION]", "[CLARIFY_NOTE]"]);
assertDynamicContextLast("followup", prompts.followup, ["DYNAMIC_FOLLOWUP_ORIGINAL", "DYNAMIC_FOLLOWUP_SUMMARY", "DYNAMIC_FOLLOWUP_QUESTION"], ["Boundaries:"]);

console.log("phase1.5 prompt cache tests passed");
