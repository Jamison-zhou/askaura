import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleSource = readFileSync(new URL("../assets/app/share-image.js", import.meta.url), "utf8");
const {
  buildObservationShareSvg,
  svgTextWidth,
  wrapSvgText,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`);

const lines = wrapSvgText("一".repeat(90), 21, 4);
const svg = buildObservationShareSvg({
  observationId: "askaura-12345678",
  createdAt: "2026-07-22T10:00:00.000Z",
  symbol: "一根正在慢慢松开的绳结",
  question: "同事生病，我该怎么关心才不过界？",
  summary: "这次结果提醒你，保持适度距离，专注自己的职责，不替他人承担。",
  doText: "留意同事是否需要一杯温水或简单帮助。",
  imageDataUrl: "data:image/webp;base64,UklGRg==",
}, { language: "zh" });

assert.ok(lines.length <= 4, "share summary respects max line count");
assert.ok(lines.every((line) => svgTextWidth(line) <= 21), "share summary lines fit the card width");
assert.ok(lines.at(-1).endsWith("…"), "overlong share summary is visibly shortened");
assert.match(svg, /width="1080" height="1440"/, "share card exports at portrait social resolution");
assert.match(svg, /OBSERVATION RECORD/, "share card uses the observation record identity");
assert.match(svg, /data:image\/webp;base64/, "share card embeds the selected card artwork");
assert.match(svg, /NEXT ACTION/, "share card keeps one concrete action prominent");
assert.match(svg, /#C85A50/, "share card keeps the restrained registration node accent");
assert.doesNotMatch(svg, /askaura\.vercel\.app|The Devil/, "share card footer avoids deployment URL and raw legacy card names");

console.log("share image layout tests passed");
