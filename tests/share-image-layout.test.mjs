import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = html.slice(html.indexOf("function svgTextWidth"), html.indexOf("function downloadBlob"));
const context = {
  lang: "zh",
  cleanText(value, fallback = "") {
    return String(value ?? fallback).replace(/\s+/g, " ").trim();
  }
};

vm.runInNewContext(`${source}; globalThis.wrapSvgText = wrapSvgText; globalThis.svgTextWidth = svgTextWidth; globalThis.shareCardSvg = shareCardSvg;`, context);

const lines = context.wrapSvgText("\u4e00".repeat(90), 21, 4);
const svg = context.shareCardSvg({
  symbol: "\u6076\u9b54",
  question: "\u540c\u4e8b\u751f\u75c5\uff0c\u6211\u8be5\u600e\u4e48\u5173\u5fc3\u624d\u4e0d\u8fc7\u754c\uff1f",
  summary: "\u8fd9\u6b21\u7ed3\u679c\u63d0\u9192\u4f60\uff0c\u4fdd\u6301\u9002\u5ea6\u8ddd\u79bb\uff0c\u4e13\u6ce8\u81ea\u5df1\u7684\u804c\u8d23\uff0c\u4e0d\u66ff\u4ed6\u4eba\u627f\u62c5\u3002",
  doText: "\u7559\u610f\u540c\u4e8b\u662f\u5426\u9700\u8981\u4e00\u676f\u6e29\u6c34\u6216\u7b80\u5355\u5e2e\u5fd9\u3002"
});

assert.ok(lines.length <= 4, "share summary respects max line count");
assert.ok(lines.every((line) => context.svgTextWidth(line) <= 21), "share summary lines fit the card width");
assert.ok(lines.at(-1).endsWith("\u2026"), "overlong share summary is visibly shortened");
assert.match(svg, /#030407/, "share card uses the dark AskAura surface");
assert.doesNotMatch(svg, /askaura\.vercel\.app|The Devil/, "share card footer avoids deployment URL and raw card names");

console.log("share image layout tests passed");
