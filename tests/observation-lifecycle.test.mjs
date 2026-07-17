import assert from "node:assert/strict";
import {
  confirmAction,
  createTemporaryObservation,
  isTemporaryExpired,
  normalizeLifecycle,
  recordEcho,
  saveObservation,
} from "../assets/app/observation-lifecycle.js";

const now = new Date("2026-07-17T00:00:00.000Z");
const temporary = createTemporaryObservation({ id: "r1", mode: "tarot" }, now);
assert.equal(temporary.lifecycleState, "temporary");
assert.equal(temporary.temporaryExpiresAt, "2026-07-24T00:00:00.000Z");
assert.equal(isTemporaryExpired(temporary, new Date("2026-07-25T00:00:00.000Z")), true);

const active = confirmAction(temporary, {
  selectedInsight: "先降低沟通噪音",
  action: "明晚只讨论一件具体的事",
  actionTheme: "沟通边界",
  echoDueAt: "2026-07-20T00:00:00.000Z",
}, now);
assert.equal(active.lifecycleState, "active");
assert.equal(active.temporaryExpiresAt, "");
assert.equal(saveObservation(temporary, now).lifecycleState, "saved");
assert.equal(recordEcho(active, { status: "changed", note: "有一点变化" }, now).echoStatus, "changed");
assert.equal(normalizeLifecycle({ id: "old" }).lifecycleState, "legacy");
console.log("observation lifecycle tests passed");
