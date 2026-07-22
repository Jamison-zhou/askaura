import assert from "node:assert/strict";
import { deriveHomeState, deriveJourney } from "../assets/app/journey-model.js";

const now = new Date("2026-07-17T12:00:00.000Z");
assert.equal(deriveHomeState([], now).kind, "new-user");
assert.equal(deriveHomeState([{ id: "t", lifecycleState: "temporary", updatedAt: now.toISOString() }], now).kind, "resume");
assert.equal(deriveHomeState([{ id: "a", lifecycleState: "active", echoDueAt: "2026-07-16T12:00:00.000Z" }], now).kind, "echo-due");
assert.equal(deriveHomeState([{ id: "a", lifecycleState: "active", echoDueAt: "2026-07-19T12:00:00.000Z" }], now).kind, "active");
assert.equal(deriveHomeState([{ id: "s", lifecycleState: "saved" }], now).kind, "returning");

const journey = deriveJourney([
  { id: "a", lifecycleState: "active", actionTheme: "沟通边界" },
  { id: "b", lifecycleState: "closed", actionTheme: "沟通边界", echoStatus: "changed" },
  { id: "c", lifecycleState: "legacy" },
]);
assert.equal(journey.active.length, 1);
assert.equal(journey.legacy.length, 1);
assert.equal(journey.themes[0].count, 2);
assert.equal(journey.themes[0].changed, 1);
assert.deepEqual(journey.activeLimit, { count: 1, limit: 3, reached: false });
console.log("journey model tests passed");
