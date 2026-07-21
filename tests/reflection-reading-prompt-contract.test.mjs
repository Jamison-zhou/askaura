import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../supabase/functions/_shared/prompts/reading.ts", import.meta.url), "utf8");
const validator = readFileSync(new URL("../supabase/functions/_shared/token-validator.ts", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");

assert.match(types, /export type ReflectionCategory = "state" \| "relation" \| "movement";/);
assert.match(types, /export type SpreadType = "single" \| "reflection_triad";/);

const spreadCard = types.match(/export interface SpreadCard \{[\s\S]*?\n\}/)?.[0] || "";
for (const field of [
  /id: string;/,
  /category: ReflectionCategory;/,
  /name: string;/,
  /label: string;/,
  /position: "single" \| ReflectionCategory;/,
  /coreMeaning: string;/,
  /visibleLine: string;/,
  /hiddenLine: string;/,
  /reflectionQuestions: string\[\];/,
  /actionSeeds: string\[\];/,
  /prohibitedClaims: string\[\];/,
  /meaningVersion: string;/,
]) assert.match(spreadCard, field);
assert.doesNotMatch(spreadCard, /orientation:/);

const readingRequest = types.match(/export interface ReadingRequest \{[\s\S]*?\n\}/)?.[0] || "";
for (const field of [
  /mode: "reading";/,
  /deckVersion: "reflection-v1";/,
  /cardName: string;/,
  /spreadType: SpreadType;/,
  /cards: SpreadCard\[\];/,
  /intent: string;/,
  /question: string;/,
  /round: number;/,
  /sessionHistory: string;/,
  /language: Language;/,
]) assert.match(readingRequest, field);
assert.doesNotMatch(readingRequest, /orientation:/);
assert.match(types, /export interface AdviceRequest[\s\S]*?orientation: Orientation;/);
assert.match(types, /export interface AnchorRequest[\s\S]*?orientation: Orientation;/);
assert.match(types, /export interface DrawEvent[\s\S]*?orientation: Orientation;/);

for (const token of ["REFLECTION", "HIDDEN", "VERIFY", "ACTION"]) {
  assert.match(prompt, new RegExp(`^\\[${token}\\]$`, "m"));
}
assert.match(prompt, /不超过 55 个中文字/);
assert.match(prompt, /不超过 45 个中文字/);
assert.match(prompt, /不超过 40 个中文字/);
assert.match(prompt, /只输出以下四段/);
assert.match(prompt, /under 180 characters/);
assert.match(prompt, /under 150 characters/);
assert.match(prompt, /under 120 characters/);
assert.match(prompt, /Output exactly the four sections below/);
assert.match(prompt, /hypotheses, not facts/i);
assert.match(prompt, /food, sleep, work, or study/i);
assert.match(prompt, /Dynamic context:/);
assert.match(prompt, /<DYNAMIC_CONTEXT>/);
assert.match(prompt, /<CARD_/);
assert.match(prompt, /slice\(0, 3\)/);
assert.match(prompt, /delimitedList\("PROHIBITED_CLAIMS", card\.prohibitedClaims, 6\)/);
assert.doesNotMatch(prompt, /Tarot|塔罗回应|传统牌义|正位|逆位|orientation/i);

assert.match(validator, /reading: \["REFLECTION", "HIDDEN", "VERIFY", "ACTION"\]/);

const readingBranch = edge.match(/if \(o\.mode === "reading"\) \{[\s\S]*?\n  \}/)?.[0] || "";
assert.match(readingBranch, /o\.deckVersion !== "reflection-v1"/);
assert.match(readingBranch, /"orientation" in o/);
assert.match(readingBranch, /o\.spreadType !== "single" && o\.spreadType !== "reflection_triad"/);
assert.match(readingBranch, /o\.spreadType === "single" \? 1 : 3/);
assert.match(readingBranch, /o\.cards\.length !== expectedCardCount/);
assert.match(readingBranch, /item\.id, 64/);
assert.match(readingBranch, /item\.name, 80/);
assert.match(readingBranch, /item\.label, 80/);
assert.match(readingBranch, /item\.meaningVersion, 32/);
assert.match(readingBranch, /item\.coreMeaning, 240/);
assert.match(readingBranch, /item\.visibleLine, 240/);
assert.match(readingBranch, /item\.hiddenLine, 240/);
assert.match(readingBranch, /item\.reflectionQuestions, 1, 3, 240/);
assert.match(readingBranch, /item\.actionSeeds, 1, 3, 240/);
assert.match(readingBranch, /item\.prohibitedClaims, 1, 6, 240/);
assert.match(readingBranch, /Number\.isInteger\(o\.round\)/);
assert.match(readingBranch, /item\.position/);
assert.doesNotMatch(readingBranch, /o\.orientation !==/);

const adviceAnchorTail = edge.slice(edge.indexOf('if (o.mode === "reading")'));
assert.match(adviceAnchorTail, /o\.orientation !== "upright" && o\.orientation !== "reversed"/);

const runtimeValidatorSource = [
  edge.match(/function isBoundedString\([\s\S]*?\n\}/)?.[0],
  edge.match(/function isBoundedStringArray\([\s\S]*?\n\}/)?.[0],
  edge.match(/function isReadingRequest[\s\S]*?(?=\n\nfunction buildUserPrompt)/)?.[0],
].filter(Boolean).join("\n\n")
  .replace(/:\s*unknown/g, "")
  .replace(/:\s*number/g, "")
  .replace(/\):\s*value is string\[\]/g, ")")
  .replace(/\):\s*value is string/g, ")")
  .replace(/\):\s*b is AnyReadingRequest/g, ")")
  .replace(/\s+as\s+Record<string,\s*unknown>/g, "")
  .replace(/\s+as\s+number/g, "");
const isReadingRequest = new Function(
  `"use strict";\n${runtimeValidatorSource}\nreturn isReadingRequest;`,
)();

const validCard = {
  id: "state-fog-window",
  category: "state",
  name: "Fog Window",
  label: "How am I now?",
  position: "single",
  coreMeaning: "The current view is not fully clear.",
  visibleLine: "Some facts are already known.",
  hiddenLine: "One assumption may still be untested.",
  reflectionQuestions: ["Which fact would change the judgment?"],
  actionSeeds: ["Separate known facts from guesses."],
  prohibitedClaims: ["A fixed outcome is guaranteed."],
  meaningVersion: "1.0.0",
};
const validSingle = {
  mode: "reading",
  deckVersion: "reflection-v1",
  cardName: validCard.name,
  spreadType: "single",
  cards: [validCard],
  intent: "clarity",
  question: "What should I verify first?",
  round: 1,
  sessionHistory: "",
  language: "en",
};
const validTriad = structuredClone(validSingle);
validTriad.spreadType = "reflection_triad";
validTriad.cards = [
  { ...validCard, position: "state" },
  { ...validCard, id: "relation-bridge", category: "relation", position: "relation" },
  { ...validCard, id: "movement-path", category: "movement", position: "movement" },
];

assert.equal(isReadingRequest(validSingle), true, "valid single reading passes the real edge validator");
assert.equal(isReadingRequest(validTriad), true, "valid reflection triad passes the real edge validator");

function changed(payload, update) {
  const candidate = structuredClone(payload);
  update(candidate);
  return candidate;
}

for (const field of ["reflectionQuestions", "actionSeeds", "prohibitedClaims"]) {
  assert.equal(
    isReadingRequest(changed(validSingle, (payload) => { payload.cards[0][field] = []; })),
    false,
    `empty ${field} is rejected`,
  );
}
assert.equal(isReadingRequest(changed(validSingle, (payload) => { payload.cards = validTriad.cards; })), false, "single rejects three cards");
assert.equal(isReadingRequest(changed(validTriad, (payload) => { payload.cards = [validCard]; })), false, "triad rejects one card");
assert.equal(isReadingRequest({ ...validSingle, orientation: "upright" }), false, "reading rejects orientation");
assert.equal(isReadingRequest(changed(validSingle, (payload) => { payload.cards[0].category = "future"; })), false, "unknown category is rejected");
assert.equal(isReadingRequest(changed(validSingle, (payload) => { payload.cards[0].position = "future"; })), false, "unknown position is rejected");
assert.equal(isReadingRequest(changed(validSingle, (payload) => { payload.cards[0].reflectionQuestions = [42]; })), false, "non-string array element is rejected");
assert.equal(isReadingRequest(changed(validSingle, (payload) => { payload.cards[0].actionSeeds = ["   "]; })), false, "blank array element is rejected");
assert.equal(isReadingRequest(changed(validSingle, (payload) => { payload.cards[0].prohibitedClaims = ["x".repeat(241)]; })), false, "overlong array element is rejected");

console.log("reflection reading prompt contract tests passed");
