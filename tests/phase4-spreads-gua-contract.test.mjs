import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const storage = readFileSync(new URL("../assets/app/storage.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../assets/app/sync.js", import.meta.url), "utf8");
const historyStore = readFileSync(new URL("../assets/app/history-store.js", import.meta.url), "utf8");
const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const readingPrompt = readFileSync(new URL("../supabase/functions/_shared/prompts/reading.ts", import.meta.url), "utf8");
const meihuaPrompt = readFileSync(new URL("../supabase/functions/_shared/prompts/meihua.ts", import.meta.url), "utf8");
const tokenValidator = readFileSync(new URL("../supabase/functions/_shared/token-validator.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202606030008_askaura_spread_cards.sql", import.meta.url), "utf8");

assert.match(types, /export type SpreadType = "single" \| "three_current_resistance_next" \| "relationship_tension" \| "choice_a_b_reminder"/, "backend types define all spread types");
assert.match(types, /cards\?: SpreadCard\[\]/, "reading request accepts spread cards");
assert.match(types, /spreadType\?: SpreadType/, "reading request accepts spread type");

assert.match(html, /id="spread-selector"/, "tarot mode exposes a spread selector");
assert.equal((html.match(/data-spread-type=/g) || []).length, 4, "front-end exposes four spread choices");
assert.match(html, /let selectedSpreadType = "single"/, "single card remains the default");
assert.match(html, /mode !== "tarot"[\s\S]*selectedSpreadType = "single"/, "non-tarot modes reset to single spread");
assert.match(html, /spreadPositions\(spreadType\)/, "ritual reads spread positions before selecting cards");
assert.match(html, /excludedIndexes\.push\(selection\.index\)/, "sequential card choices cannot pick the same card twice");
assert.match(html, /cards: selectedCards\.map/, "front-end sends spread cards to reading request");
assert.match(html, /spreadType: ritualResult\.spreadType/, "front-end sends selected spread type to reading request");
assert.match(html, /cards: selectedCards/, "saved tarot records include selected cards");
assert.match(html, /id="symbol-spread-list"/, "result symbol panel includes a spread card list");
assert.match(html, /function renderSymbolSpread\(cards = \[\]\)/, "front-end renders all selected spread cards, not only the primary card");
assert.match(html, /updateSymbolSummary\(\{ sourceMode: "tarot"[\s\S]*cards: selectedCards/, "tarot results pass all selected cards into the symbol panel");

assert.match(storage, /normalizeHistoryRecord/, "storage delegates spread and card normalization to history-store");
assert.match(sync, /historyRecordToRow[\s\S]*from "\.\/history-store\.js"/, "sync imports history row mapping from history-store");
assert.match(historyStore, /spreadType: normalizeSpreadType\(record\.spreadType\)/, "history store normalizes spread type");
assert.match(historyStore, /cards: normalizeCards\(record\.cards\)/, "history store normalizes selected cards");
assert.match(historyStore, /spread_type: record\.spreadType \|\| "single"/, "history store writes spread type");
assert.match(historyStore, /cards: Array\.isArray\(record\.cards\) \? record\.cards : \[\]/, "history store writes cards");
assert.match(historyStore, /gua: record\.gua \|\| null/, "history store writes gua payload");
assert.match(historyStore, /spreadType: row\.spread_type \|\| "single"/, "history store restores spread type");
assert.match(historyStore, /gua: row\.gua \|\| null/, "history store restores gua payload");
assert.match(migration, /add column if not exists spread_type text/, "migration adds spread type");
assert.match(migration, /add column if not exists cards jsonb/, "migration adds cards jsonb");
assert.match(migration, /add column if not exists gua jsonb/, "migration adds gua jsonb");

assert.match(readingPrompt, /one sentence per card/i, "spread prompt keeps one sentence per card");
assert.match(readingPrompt, /must not claim to know the other person's hidden mind/, "relationship spread protects hidden-mind boundary");
assert.match(readingPrompt, /must not decide A or B for the user/, "choice spread does not decide for the user");

assert.match(html, /id="gua-cast-selector"/, "meihua mode exposes cast method selector");
assert.equal((html.match(/data-gua-cast=/g) || []).length, 4, "front-end exposes four gua cast methods");
assert.match(html, /guaFromCast\(selectedGuaCastMethod, guaSeed\)/, "meihua flow uses deterministic cast method and seed");
assert.match(html, /const meihua = renderMeihuaReading\(full\);[\s\S]*summary: meihua\.trend \|\| meihua\.signal \|\| meihua\.action[\s\S]*tarotText: meihua\.signal[\s\S]*guaText: meihua\.trend/, "meihua mode maps trend and signal into separate report slots");
assert.match(html, /const showTopAction = false;[\s\S]*els\.action\.textContent = showTopAction \? lastAction : "";[\s\S]*els\.action\.hidden = !showTopAction \|\| !lastAction;/, "the top action sentence stays hidden because the action board owns that content");
assert.match(html, /const hasDetailedReport = !els\.tarotReadingGrid\.hidden \|\| !els\.reportStack\.hidden;[\s\S]*const showSummary = !duplicateSummary && !hasDetailedReport;[\s\S]*els\.resultSummary\.hidden = !showSummary;/, "top summary is hidden whenever a detailed report is already present");
const renderActionBlock = html.match(/function renderAction\(rawText\) \{([\s\S]*?)\n\s*\}/)?.[1] || "";
assert.match(renderActionBlock, /lastAction = sentence;[\s\S]*return sentence;/, "streaming action text is retained for saving without rendering a duplicate top action");
assert.doesNotMatch(renderActionBlock, /els\.action\.textContent = sentence/, "streaming action text is not written into the top action slot");
assert.match(html, /const meihua = renderMeihuaReading\(meihuaFull\);[\s\S]*guaText: \[meihua\.signal, meihua\.trend\]\.filter\(Boolean\)\.join\("\\n"\)/, "dual mode reuses richer meihua report tokens");
assert.match(meihuaPrompt, /\[GUA_SIGNAL\]/, "meihua prompt requires signal token");
assert.match(meihuaPrompt, /\[GUA_TREND\]/, "meihua prompt requires trend token");
assert.match(meihuaPrompt, /\[ACTION\]/, "meihua prompt keeps action token");
assert.match(tokenValidator, /"meihua-reading": \["GUA_SIGNAL", "GUA_TREND", "ACTION"\]/, "token validator requires richer meihua output");
assert.match(css, /\.spread-selector,[\s\S]*\.gua-cast-selector/, "spread and gua controls share compact styling");
assert.match(css, /\.symbol-spread-list \{[\s\S]*display: grid;/, "spread cards have a compact result-panel layout");
assert.match(css, /\.gua-cast-selector input \{[\s\S]*?background: var\(--control-bg\);[\s\S]*?color: rgba\(240, 237, 229, 0\.78\);/, "gua seed input uses the dark compact control style");
assert.match(css, /\.gua-cast-selector input:focus \{[\s\S]*?border-color: rgba\(156, 122, 74, 0\.38\);[\s\S]*?background: rgba\(156, 122, 74, 0\.075\);/, "gua seed input focus stays in the AskAura palette");

console.log("phase4 spreads and gua contract passed");
