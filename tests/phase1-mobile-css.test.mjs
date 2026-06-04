import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

assert.match(css, /\.result-actions \{[\s\S]*position: static;[\s\S]*z-index: auto;/, "result actions stay in normal flow instead of overlaying content");
assert.doesNotMatch(css, /\.result-actions \{[\s\S]*position: sticky;/, "result actions do not use sticky bottom positioning");
assert.match(css, /@media \(max-width: 980px\) \{[\s\S]*\.mirror-room \{[\s\S]*height: auto;[\s\S]*min-height: 100dvh;[\s\S]*overflow: visible;/, "mobile shell can scroll when home content exceeds the viewport");
assert.match(css, /@media \(max-width: 980px\) \{[\s\S]*\.answer-panel \{[\s\S]*height: auto;[\s\S]*max-height: none;[\s\S]*overflow: visible;/, "mobile answer panel lets result content and actions flow without clipping");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.result-body \{[\s\S]*padding: 22px;/, "mobile result body keeps compact padding");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mode-nav \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/, "mobile mode navigation stays compact in the first viewport");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.mirror-stage \{[\s\S]*right: 0;/, "mobile decorative stage does not create horizontal overflow");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.result-actions \{[\s\S]*padding: 14px 22px 22px;/, "mobile result actions use compact in-flow padding");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.result-actions \.secondary \{[\s\S]*min-width: 0;[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/, "mobile result action buttons wrap instead of causing horizontal overflow");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.ritual-deck \{[\s\S]*width: calc\(100% - 20px\);[\s\S]*transform: translateY\(132px\) scale\(0\.64\);/, "mobile ritual deck is constrained inside the viewport");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.ritual-preview-actions \{[\s\S]*left: 18px;[\s\S]*right: 18px;/, "mobile ritual preview actions stay inside the viewport");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.followup-options,[\s\S]*\.followup-custom \{[\s\S]*grid-template-columns: 1fr;/, "mobile follow-up controls collapse to one column");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.followup-custom button \{[\s\S]*width: 100%;/, "mobile follow-up submit button uses full width");

console.log("phase1 mobile css tests passed");
