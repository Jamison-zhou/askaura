import assert from "node:assert/strict";

import { guaFromTime } from "../assets/app/meihua.js";

const morning = guaFromTime(new Date("2026-05-22T08:15:00+08:00"));
const sameMorning = guaFromTime(new Date("2026-05-22T08:15:00+08:00"));
const evening = guaFromTime(new Date("2026-05-22T21:45:00+08:00"));

assert.deepEqual(morning, sameMorning);
assert.equal(typeof morning.binary, "string");
assert.equal(morning.binary.length, 3);
assert.match(morning.binary, /^[01]{3}$/);
assert.notEqual(`${morning.name}-${morning.binary}`, `${evening.name}-${evening.binary}`);

console.log("meihua tests passed");
