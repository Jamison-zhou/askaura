import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

assert.match(css, /\.result-actions \{[\s\S]*position: static;[\s\S]*z-index: auto;/, "result actions stay in normal flow instead of overlaying content");
assert.doesNotMatch(css, /\.result-actions \{[\s\S]*position: sticky;/, "result actions do not use sticky bottom positioning");
assert.match(css, /@media \(max-width: 980px\) \{[\s\S]*\.mirror-room \{[\s\S]*height: auto;[\s\S]*min-height: 100dvh;[\s\S]*overflow-x: clip;[\s\S]*overflow-y: visible;/, "mobile shell can scroll vertically without horizontal overflow");
assert.match(css, /@media \(max-width: 980px\) \{[\s\S]*\.answer-panel \{[\s\S]*height: auto;[\s\S]*max-height: none;[\s\S]*overflow: visible;/, "mobile answer panel lets result content and actions flow without clipping");
assert.match(css, /\.ritual-stage \{[\s\S]*--ritual-fan-scale: 1;/, "ritual card fan has a default compression variable");
assert.match(css, /\.mode-nav button:not\(\.entry-nav\) \{[\s\S]*padding-block: 10px;[\s\S]*color: rgba\(240, 237, 229, 0\.68\);/, "left rail mode entries are quieter than the start entry");
assert.match(css, /@media \(max-width: 980px\) \{[\s\S]*\.ritual-stage \{[\s\S]*--ritual-fan-scale: 0\.62;/, "tablet ritual fan compresses card positions");
assert.match(css, /\.result-body \{[\s\S]*grid-template-columns: 1fr;[\s\S]*gap: 24px;/, "result body lets the result layout own desktop columns");
assert.match(css, /@media \(max-width: 780px\) \{[\s\S]*\.mode-card-grid,[\s\S]*\.result-layout \{[\s\S]*grid-template-columns: 1fr;/, "mode cards and result layout stack into one column on narrow screens");
assert.match(css, /@media \(max-width: 780px\) \{[\s\S]*\.answer-panel\.is-dual-report \.result-layout \{[\s\S]*grid-template-columns: 1fr;/, "dual report layout also stacks into one column on narrow screens");
assert.match(css, /@media \(max-width: 780px\) \{[\s\S]*\.result-main-panel \{[\s\S]*order: 1;[\s\S]*\.result-symbol-panel \{[\s\S]*order: 2;/, "mobile result flow keeps reading text before symbols");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.result-body,[\s\S]*\.result-layout \{[\s\S]*padding: 22px;/, "mobile result body keeps compact padding");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mode-nav \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/, "phone mode navigation wraps to keep all entries visible");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mode-card-grid \{[\s\S]*gap: 12px;/, "mode card spacing tightens on the smallest screens");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mirror-room \{[\s\S]*width: 100%;[\s\S]*padding: 14px 10px;/, "mobile shell fills the viewport while keeping compact safe padding");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.side-rail \{[\s\S]*gap: 10px 12px;[\s\S]*padding: 12px 14px;/, "mobile rail stays compact without crowding content");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mobile-rail-menu \{[\s\S]*grid-column: 2;[\s\S]*grid-row: 1;/, "closed mobile menu stays in the top rail instead of pushing the first screen down");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mobile-rail-menu\[open\] \{[\s\S]*display: contents;/, "open mobile menu lets its summary stay in the top row while options take a compact second row");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mobile-rail-menu\[open\] summary \{[\s\S]*grid-column: 2;[\s\S]*grid-row: 1;/, "open mobile menu summary stays aligned with the language switch");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mobile-rail-menu div \{[\s\S]*grid-column: 1 \/ -1;[\s\S]*grid-row: 2;[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/, "mobile menu options take one compact row instead of covering the headline or pushing the form too far down");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.hero-ritual \{[\s\S]*display: none;/, "mobile hides decorative symbol cluster so the tool appears first");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.compose-panel \{[\s\S]*width: 100%;/, "mobile question panel fills the available width");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.result-actions \{[\s\S]*padding: 14px 22px 22px;/, "mobile result actions use compact in-flow padding");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.result-actions \.secondary \{[\s\S]*min-width: 0;[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/, "mobile result action buttons wrap instead of causing horizontal overflow");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.ritual-deck \{[\s\S]*width: calc\(100% - 20px\);[\s\S]*transform: translateY\(132px\) scale\(0\.64\);/, "mobile ritual deck is constrained inside the viewport");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.ritual-stage \{[\s\S]*--ritual-fan-scale: 0\.36;/, "phone ritual fan compresses card positions");
assert.match(css, /@media \(min-width: 1500px\) \{[\s\S]*\.answer-panel \{[\s\S]*width: min\(100%, 1340px\);/, "large desktop answer panel is capped for readable line lengths");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.ritual-preview-actions \{[\s\S]*left: 18px;[\s\S]*right: 18px;/, "mobile ritual preview actions stay inside the viewport");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.followup-options,[\s\S]*\.followup-custom \{[\s\S]*grid-template-columns: 1fr;/, "mobile follow-up controls collapse to one column");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.followup-custom button \{[\s\S]*width: 100%;/, "mobile follow-up submit button uses full width");

console.log("phase1 mobile css tests passed");
