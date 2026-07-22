import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appSource } from "./helpers/app-source.mjs";

const html = appSource;
const deckSource = readFileSync(new URL("../assets/app/reflection-deck.js", import.meta.url), "utf8");
const resultRenderer = readFileSync(new URL("../assets/app/result-renderer.js", import.meta.url), "utf8");

assert.match(html, /REFLECTION_DECK/, "home page imports the reflection deck");
assert.match(deckSource, /REFLECTION_CATEGORIES/, "reflection deck exports category metadata");
assert.match(html, /reflectionCardForSelection/, "draw preview uses category-aware reflection selection");
assert.match(html, /buildReflectionReadingRequest/, "home page builds the reflection reading request");
assert.match(html, /completeReflectionReading/, "home page completes partial reflection responses safely");
assert.match(html, /data-spread-type="reflection_triad"/, "home page exposes the three-lens spread");
assert.equal((html.match(/data-spread-type=/g) || []).length, 2, "home page exposes exactly two reflection spreads");
assert.doesNotMatch(html, /TAROT_DECK/, "legacy tarot deck is not wired into the new flow");
assert.doesNotMatch(html, /primaryCard\.orientation/, "new reflection requests do not send orientation");
assert.match(html, /imageFallbackSrc/, "card image rendering supports the authored fallback image");
assert.match(html, /meaningVersion/, "saved records preserve the card meaning version");
assert.match(html, /function waitForCardChoice\(position = \{ key: "single", category: null, label: "" \}, excludedIndexes = \[\]\)/, "card choice receives the full spread position");
assert.match(html, /reflectionCardForSelection\(\{ index, position \}\)/, "preview maps an index through the same category-aware selector as saving");
assert.match(html, /selectedCards\.push\(\{ \.\.\.selection, position \}\)/, "ritual result keeps the position used for the preview");
assert.match(html, /function showReflectionCardImage\(card\)/, "reflection card images use a dedicated guarded renderer");
assert.match(html, /dataset\.fallbackApplied === "true"/, "image fallback is applied at most once");
assert.match(html, /function renderReflectionReading\(parts\)/, "reflection readings render their four-part structure");
assert.match(resultRenderer, /record\?\.deckVersion === "reflection-v1"[\s\S]*reflectionReportFromRecord/, "saved reflection readings restore through the reflection report path");

for (const token of [
  "spreadReflectionTriad",
  "spreadPositionState",
  "spreadPositionRelation",
  "spreadPositionMovement",
  "reflectionSeenLabel",
  "reflectionHiddenLabel",
  "reflectionVerifyLabel",
  "reflectionActionLabel",
]) {
  assert.match(html, new RegExp(`${token}:`), `${token} is localized`);
}

console.log("reflection deck index contract passed");
