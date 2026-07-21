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
assert.match(readingBranch, /!\[1, 3\]\.includes\(o\.cards\.length\)/);
assert.match(readingBranch, /item\.id, 64/);
assert.match(readingBranch, /item\.name, 80/);
assert.match(readingBranch, /item\.label, 80/);
assert.match(readingBranch, /item\.meaningVersion, 32/);
assert.match(readingBranch, /item\.coreMeaning, 240/);
assert.match(readingBranch, /item\.visibleLine, 240/);
assert.match(readingBranch, /item\.hiddenLine, 240/);
assert.match(readingBranch, /item\.reflectionQuestions, 3, 240/);
assert.match(readingBranch, /item\.actionSeeds, 3, 240/);
assert.match(readingBranch, /item\.prohibitedClaims, 6, 240/);
assert.match(readingBranch, /Number\.isInteger\(o\.round\)/);
assert.match(readingBranch, /item\.position/);
assert.doesNotMatch(readingBranch, /o\.orientation !==/);

const adviceAnchorTail = edge.slice(edge.indexOf('if (o.mode === "reading")'));
assert.match(adviceAnchorTail, /o\.orientation !== "upright" && o\.orientation !== "reversed"/);

console.log("reflection reading prompt contract tests passed");
