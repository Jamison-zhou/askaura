import assert from "node:assert/strict";
import {
  isBusyState,
  nextToneForMode,
  viewStateClass,
} from "../assets/app/ui-state.js";

assert.equal(isBusyState("streaming"), true);
assert.equal(isBusyState("idle"), false);
assert.equal(nextToneForMode("meihua"), "meihua");
assert.equal(nextToneForMode("dual"), "dual");
assert.equal(nextToneForMode("unknown"), "tarot");
assert.equal(viewStateClass({ hasResult: true, isBusy: false }), "has-result");
assert.equal(viewStateClass({ hasResult: false, isBusy: true }), "is-busy");
assert.equal(viewStateClass({ hasResult: false, isBusy: false }), "is-idle");

console.log("ui state tests passed");
