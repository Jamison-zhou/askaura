import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { appSource } from "./helpers/app-source.mjs";

const indexHtml = appSource;
const adminHtml = readFileSync(new URL("../admin.html", import.meta.url), "utf8");
const themeUrl = new URL("../theme-observation.css", import.meta.url);

assert.match(indexHtml, /theme-observation\.css\?v=[^"']+/, "public page loads a versioned observation theme");
assert.match(
  indexHtml,
  /location\.protocol === "file:"[\s\S]*127\.0\.0\.1:5174\/index\.html[\s\S]*location\.replace/,
  "direct file entry redirects to the supported local HTTP app",
);
assert.match(adminHtml, /theme-observation\.css\?v=[^"']+/, "admin page loads a versioned observation theme");
assert.ok(
  indexHtml.indexOf('id="question-input"') < indexHtml.indexOf('id="mode-card-grid"'),
  "question input appears before mode selection",
);
assert.ok(
  indexHtml.indexOf('id="action-board"') < indexHtml.indexOf('id="tarot-reading-grid"'),
  "action board appears before detailed reading evidence",
);
assert.match(indexHtml, /class="question-primary"/, "homepage has a primary question region");
assert.match(indexHtml, /class="question-secondary"/, "homepage groups secondary controls");
assert.match(indexHtml, /data-app-ready="false"/, "page exposes its startup state");
assert.match(indexHtml, /dataset\.appReady = "true"/, "page marks interaction startup complete");
assert.match(indexHtml, /data-theme-setting="night"/, "formal page exposes the night theme");
assert.match(indexHtml, /data-theme-setting="light"/, "formal page exposes the light theme");
assert.match(indexHtml, /data-theme-setting="mono"/, "formal page exposes the monochrome theme");
assert.match(indexHtml, /askaura\.theme\.v1/, "theme preference has a dedicated persistence key");
assert.match(indexHtml, /id="brand-loading"/, "formal flow includes the branded loading state");
assert.match(
  indexHtml,
  /class="ritual-card-back"><\/span>/,
  "ritual cards keep the production card back free of repeated logo copy",
);
assert.doesNotMatch(
  indexHtml,
  /ritual-card-face"\)\.style\.backgroundImage/,
  "ritual deck does not eagerly assign every card face image",
);
assert.ok(existsSync(themeUrl), "observation theme stylesheet exists");

const themeCss = readFileSync(themeUrl, "utf8");

[
  "askaura-observation-home.webp",
  "askaura-observation-ritual.webp",
  ".compose-panel",
  ".theme-switcher",
  ".brand-loading",
  "askaura-observation-gate-back.webp",
  ".ritual-stage",
  ".result-layout",
  ".utility-sheet",
  ".admin-shell",
  ".auth-card",
  ".admin-board",
  "@media (max-width: 780px)",
  "@media (prefers-reduced-motion: reduce)",
].forEach((needle) => assert.ok(themeCss.includes(needle), `theme keeps ${needle}`));

assert.match(themeCss, /:root\[data-theme="light"\]/, "theme includes the light palette");
assert.match(themeCss, /:root\[data-theme="mono"\]/, "theme includes the monochrome palette");

assert.ok(
  existsSync(new URL("../assets/backgrounds/askaura-observation-home.webp", import.meta.url)),
  "homepage background exists",
);
assert.ok(
  existsSync(new URL("../assets/backgrounds/askaura-observation-ritual.webp", import.meta.url)),
  "ritual background exists",
);
assert.ok(
  existsSync(new URL("../assets/cards/backs/askaura-observation-gate-back.webp", import.meta.url)),
  "production ritual card back exists",
);
assert.match(
  themeCss,
  /@media \(max-width: 780px\)[\s\S]*\.action-board,[\s\S]*\.companion-grid \{[\s\S]*grid-template-columns: 1fr;/,
  "mobile result and companion grids collapse to one column",
);
assert.match(
  themeCss,
  /@media \(max-width: 780px\)[\s\S]*\.mirror-room \{[\s\S]*width: 100%;[\s\S]*max-width: 100%;/,
  "mobile shell avoids viewport-width overflow when a scrollbar appears",
);

console.log("observation theme contract passed");
