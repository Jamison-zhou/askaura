import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appSource } from "./helpers/app-source.mjs";

const settings = readFileSync(new URL("../assets/app/views/settings-view.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../assets/app/sync.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
for (const phrase of ["本机", "云端", "AI 服务", "匿名产品统计", "导出我的数据", "清空本机数据", "清空云端数据", "删除账号", "实验性语言"]) {
  assert.match(settings, new RegExp(phrase), `settings explains ${phrase}`);
}
assert.match(appSource, /默认保存在本机/);
assert.match(appSource, /发送给 AI 服务处理/);
assert.doesNotMatch(appSource, /你的问题与结果仅对你可见/);
assert.match(sync, /function exportData\(settings = \{\}\)/);
assert.match(sync, /records: loadHistory\(store\)/);
assert.match(sync, /dailyAnchors: \[\]/);
assert.doesNotMatch(sync.match(/function exportData[\s\S]*?\n  }/)?.[0] || "", /access_token|refresh_token/);
assert.match(css, /\.settings-options button,[\s\S]*?color: var\(--obs-ink/, "settings controls inherit every observation theme");
assert.match(css, /\[data-settings-analytics\][\s\S]*?accent-color:/, "analytics preference uses a compact themed checkbox");

console.log("privacy controls contract passed");
