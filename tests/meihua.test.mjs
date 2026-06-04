import assert from "node:assert/strict";

import {
  GUA_CAST_METHODS,
  guaFromCast,
  guaFromCharacter,
  guaFromNumber,
  guaFromTime,
  normalizeGuaSeed,
} from "../assets/app/meihua.js";

assert.deepEqual(GUA_CAST_METHODS, Object.freeze({
  time: "time",
  character: "character",
  number: "number",
  casualNumber: "casual_number",
}));

assert.equal(normalizeGuaSeed(" 问卦 ", "character"), "问");
assert.equal(normalizeGuaSeed("a-42b", "number"), "-42");
assert.equal(normalizeGuaSeed(" 108 ", "casual_number"), "108");
assert.equal(normalizeGuaSeed("", "number"), "");

const morningDate = new Date("2026-05-22T08:15:00+08:00");
const morning = guaFromTime(morningDate);
const sameMorning = guaFromTime(new Date("2026-05-22T08:15:00+08:00"));
const evening = guaFromTime(new Date("2026-05-22T21:45:00+08:00"));

assert.deepEqual(morning, sameMorning);
assert.equal(typeof morning.binary, "string");
assert.equal(morning.binary.length, 3);
assert.match(morning.binary, /^[01]{3}$/);
assert.notEqual(`${morning.name}-${morning.binary}`, `${evening.name}-${evening.binary}`);
assert.equal(morning.castMethod, "time");

const charCast = guaFromCharacter("问");
const sameCharCast = guaFromCast("character", "问卦");
const numberCast = guaFromNumber("42");
const sameNumberCast = guaFromCast("number", "a42b");
const casualCast = guaFromCast("casual_number", "108");
const sameCasualCast = guaFromCast("casual_number", "108");
const differentNumberCast = guaFromNumber("43");
const unknownCast = guaFromCast("unknown", "42", morningDate);

assert.deepEqual(charCast, sameCharCast);
assert.deepEqual(numberCast, sameNumberCast);
assert.deepEqual(casualCast, sameCasualCast);
assert.equal(charCast.castMethod, "character");
assert.equal(numberCast.castMethod, "number");
assert.equal(casualCast.castMethod, "casual_number");
assert.equal(typeof casualCast.seed, "string");
assert.notDeepEqual(numberCast, differentNumberCast);
assert.equal(unknownCast.castMethod, "time");
assert.equal(unknownCast.seed, morningDate.toISOString());

console.log("meihua tests passed");
