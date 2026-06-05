import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);

assert.ok(scriptMatch, "index module script exists");
assert.match(html, /class="result-layout"/, "result page uses the result layout wrapper");
assert.match(html, /class="result-symbol-panel"/, "result page has a symbol panel wrapper");
assert.match(html, /class="result-main-panel"/, "result page has a main result panel wrapper");
assert.match(html, /class="core-conclusion"/, "result page promotes the core conclusion");
assert.match(html, /nextStepHeading/, "action board heading uses the next step translation key");
assert.match(html, /is-dual-report/, "dual report rendering has a panel-level class hook");
assert.match(html, /sourceMode === "dual"/, "dual report class is driven by sourceMode");
assert.match(html, /id="mode-card-grid"/, "front-end renders a mode card selector");
assert.match(html, /data-mode-card="tarot"/, "mode card selector includes tarot mode");
assert.match(html, /data-mode-card="meihua"/, "mode card selector includes meihua mode");
assert.match(html, /data-mode-card="dual"/, "mode card selector includes dual mode");
assert.match(html, /class="mode-card-dot"/, "mode cards show a small selected-state dot");
assert.match(html, /privacyNote/, "privacy note is localized");
assert.match(html, /modeCardTarotCopy/, "tarot mode card copy is localized");
assert.match(html, /modeTarotNav/, "tarot navigation label is separate from semantic tarot result label");
assert.match(html, /modeTarotRail/, "left rail has a compact tarot navigation label");
assert.match(html, /modeMeihuaRail/, "left rail has a compact gua navigation label");
assert.match(html, /modeDualRail/, "left rail has a compact dual navigation label");
assert.match(html, /modeTarot: "牌象解读"/, "semantic tarot label remains usable for results and history");
assert.match(html, /class="entry-nav active" type="button" data-next="idle"/, "left rail keeps a separate start entry");
assert.match(html, /data-mode="tarot" data-tone="tarot"[\s\S]*data-i18n="modeTarotRail">牌象/, "left rail keeps a compact tarot entry");
assert.match(html, /data-mode-card="tarot"[\s\S]*data-i18n="modeTarotResult">牌象解读/, "mode card keeps the full tarot reading label");
assert.match(html, /function syncRailNav\(\)/, "left rail active state is synced between start and result modes");

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  let depth = 0;
  const headerMatch = source.slice(start).match(new RegExp(`^function ${name}\\([\\s\\S]*?\\)\\s*\\{`));
  assert.ok(headerMatch, `${name} header parses`);
  const bodyStart = start + headerMatch[0].length - 1;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unable to extract ${name}`);
}

const context = {
  lang: "zh",
  formatDate: () => "06/04",
  formatDailyAnchor: () => "锚点",
  t: (key) => ({
    modeTarot: "牌象解读",
    modeMeihua: "卦象解读",
    modeDual: "双象报告",
    modeDaily: "每日镜笺",
    dailyNoteTitle: "今日镜笺",
    answerTitle: "解读结果",
    actionStatusDone: "做了，有帮助",
    actionStatusNotDone: "还没做",
    actionStatusSkipped: "跳过了",
    actionStatusNotFit: "不太适合",
    copiedAction: "行动已复制",
    copiedSummary: "摘要已复制",
    copiedFull: "完整结果已复制",
    emptyFallback: "—",
  }[key] || key),
  cleanText(value, fallback = "—") {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text || text === "undefined" || text === "null" || text === "NaN") return fallback;
    return text;
  },
};

[
  "modeLabelText",
  "normalizedTitleText",
  "recordTitle",
  "historyMeta",
  "actionStatusLabel",
  "companionCountText",
  "companionJoinText",
  "companionTrailText",
  "copySuccessText",
].forEach((name) => {
  const source = extractFunctionSource(scriptMatch[1], name);
  vm.runInNewContext(`${source}; this.${name} = ${name};`, context);
});

assert.equal(
  context.recordTitle({ mode: "dual", title: "双象报告 · 正义 / 兑" }),
  "正义 / 兑",
  "history title strips the duplicated dual mode label",
);
assert.equal(
  context.recordTitle({ mode: "meihua", title: "卦象解读 · 艮" }),
  "艮",
  "history title strips the duplicated meihua mode label",
);
assert.equal(
  context.historyMeta({ mode: "dual", createdAt: "2026-06-04T00:00:00.000Z" }),
  "双象报告 · 06/04",
  "history metadata keeps mode and date outside the title",
);

assert.equal(
  context.companionCountText(context.modeLabelText("dual"), 2),
  "双象报告：2",
  "companion counts use localized labels and Chinese punctuation",
);
assert.equal(
  context.companionTrailText({
    mode: "tarot",
    symbol: "正义",
    action: "写一句事实",
    actionStatus: "done",
  }),
  "牌象解读｜正义｜写一句事实｜做了，有帮助",
  "companion trail localizes mode and status labels",
);

assert.equal(context.copySuccessText("action"), "行动已复制");
assert.equal(context.copySuccessText("summary"), "摘要已复制");
assert.equal(context.copySuccessText("full"), "完整结果已复制");

console.log("index display contract passed");
