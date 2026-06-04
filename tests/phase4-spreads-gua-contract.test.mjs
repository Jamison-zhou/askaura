import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const storage = readFileSync(new URL("../assets/app/storage.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../assets/app/sync.js", import.meta.url), "utf8");
const historyStore = readFileSync(new URL("../assets/app/history-store.js", import.meta.url), "utf8");
const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const readingPrompt = readFileSync(new URL("../supabase/functions/_shared/prompts/reading.ts", import.meta.url), "utf8");
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
assert.match(css, /\.spread-selector,[\s\S]*\.gua-cast-selector/, "spread and gua controls share compact styling");

console.log("phase4 spreads and gua contract passed");
