import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.result-body \{[\s\S]*padding: 22px;/, "mobile result body keeps compact padding");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.ritual-deck \{[\s\S]*width: calc\(100% - 20px\);[\s\S]*transform: translateY\(132px\) scale\(0\.64\);/, "mobile ritual deck is constrained inside the viewport");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.ritual-preview-actions \{[\s\S]*left: 18px;[\s\S]*right: 18px;/, "mobile ritual preview actions stay inside the viewport");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.followup-options,[\s\S]*\.followup-custom \{[\s\S]*grid-template-columns: 1fr;/, "mobile follow-up controls collapse to one column");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.followup-custom button \{[\s\S]*width: 100%;/, "mobile follow-up submit button uses full width");

console.log("phase1 mobile css tests passed");
