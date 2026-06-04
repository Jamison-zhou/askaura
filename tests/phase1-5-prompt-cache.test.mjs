import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  return execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    { encoding: "utf8" },
  ).trim();
}

const prompts = JSON.parse(runTsScript(`
  const out = {};
  out.reading = (await import(${JSON.stringify(modules.reading)})).buildReadingPrompt({
    mode: "reading",
    cardName: "The Moon",
    orientation: "upright",
    intent: "clarity",
    question: "DYNAMIC_READING_QUESTION",
    round: 1,
    sessionHistory: "DYNAMIC_READING_HISTORY",
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

assertDynamicContextLast("reading", prompts.reading, ["DYNAMIC_READING_QUESTION", "DYNAMIC_READING_HISTORY"], ["[CORE_QUESTION]", "[ACTION]"]);
assertDynamicContextLast("meihua", prompts.meihua, ["DYNAMIC_MEIHUA_QUESTION"], ["[ACTION]"]);
assertDynamicContextLast("advice", prompts.advice, ["DYNAMIC_ADVICE_QUESTION", "DYNAMIC_ADVICE_SUMMARY"], ["[ACTION]"]);
assertDynamicContextLast("anchor", prompts.anchor, ["Temperance"], ["[ANCHOR_CORE]", "[ANCHOR_TAKEAWAY]"]);
assertDynamicContextLast("clarify", prompts.clarify, ["DYNAMIC_CLARIFY_QUESTION"], ["[CLARIFIED_QUESTION]", "[CLARIFY_NOTE]"]);
assertDynamicContextLast("followup", prompts.followup, ["DYNAMIC_FOLLOWUP_ORIGINAL", "DYNAMIC_FOLLOWUP_SUMMARY", "DYNAMIC_FOLLOWUP_QUESTION"], ["Boundaries:"]);

console.log("phase1.5 prompt cache tests passed");
