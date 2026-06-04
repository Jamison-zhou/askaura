import assert from "node:assert/strict";
import { buildCompactShareLines } from "../assets/app/share-text.js";

const zhLabels = {
  action: "行动",
  question: "问题",
  symbol: "象",
  summary: "核心结论",
  doText: "今天可以做",
  dontText: "今天不要做",
  watchText: "接下来观察",
  reviewNote: "复盘",
};

assert.deepEqual(
  buildCompactShareLines(
    {
      symbol: "火天大有",
      summary: "先收拢判断，再做决定。",
      action: "把今天最重要的一步写下来。",
    },
    zhLabels,
  ),
  [
    "火天大有",
    "先收拢判断，再做决定。",
    "行动: 把今天最重要的一步写下来。",
  ],
);

assert.deepEqual(
  buildCompactShareLines(
    {
      symbol: "",
      summary: "先把真正想说的话说清楚。",
      action: "",
    },
    zhLabels,
  ),
  [
    "先把真正想说的话说清楚。",
  ],
);

console.log("share text tests passed");
