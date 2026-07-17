import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizeProductEvent } from "../assets/app/product-events.js";

const event = sanitizeProductEvent("action_confirmed", {
  mode: "tarot", lifecycleState: "active", question: "private",
  answer: "private", action: "private", note: "private", durationMs: 4200
});
assert.deepEqual(event, {
  eventName: "action_confirmed",
  mode: "tarot",
  lifecycleState: "active",
  durationBucket: "3-10s",
  errorCode: ""
});
assert.equal(sanitizeProductEvent("unknown", {}), null);
assert.equal(sanitizeProductEvent("flow_failed", { errorCode: "private exception text" }).errorCode, "", "arbitrary error text is discarded");
assert.equal(sanitizeProductEvent("flow_failed", { errorCode: "generation_failed" }).errorCode, "generation_failed");
const edge = readFileSync(new URL("../supabase/functions/product-event/index.ts", import.meta.url), "utf8");
assert.doesNotMatch(edge, /question|answer|action_text|echo_note/);
assert.match(edge, /askaura_product_events/);
assert.match(edge, /ERROR_CODES\.has\(errorCode\)/);

console.log("product event privacy tests passed");
