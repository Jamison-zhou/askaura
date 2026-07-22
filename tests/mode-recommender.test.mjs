import assert from "node:assert/strict";
import { recommendMode } from "../assets/app/mode-recommender.js";

assert.equal(recommendMode("我现在应该推进还是再等一等").mode, "meihua");
assert.equal(recommendMode("这段关系里我为什么总是不敢表达").mode, "tarot");
assert.equal(recommendMode("我想从情绪和时机两个角度一起看").mode, "dual");
assert.deepEqual(recommendMode("我最近有点乱"), {
  mode: "tarot",
  reasonKey: "recommendDefault",
  confidence: 0.5,
});
console.log("mode recommender tests passed");
