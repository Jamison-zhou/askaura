import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);

assert.ok(scriptMatch, "index module script exists");

const script = scriptMatch[1];

assert.match(html, /styles\.css\?v=20260604-lowlight-gallery-2/, "low-light gallery changes bust the stylesheet cache");

[
  'class="mirror-room" data-step="idle" data-tone="tarot"',
  'class="field-canvas" id="field-canvas"',
  'class="surface-noise"',
  'class="side-rail"',
  'class="hero-ritual"',
  'class="work-panel compose-panel"',
  'data-i18n="heroCopy">问一件事，看两种象。',
  'data-i18n="questionLabel">你现在最想看清哪件事？',
].forEach((needle) => {
  assert.ok(html.includes(needle), `low-light first screen keeps ${needle}`);
});

[
  'id="entry-ritual"',
  'entry-ritual-canvas',
  'entry-ritual-skip',
  'entry=preview',
  'askaura.entryIntro.v1',
  'playEntryRitual',
  'maybePlayEntryRitual',
  'hideEntryRitual',
  'is-entry-locked',
].forEach((needle) => {
  assert.ok(!html.includes(needle), `blocking entry ritual markup/script removed: ${needle}`);
  assert.ok(!css.includes(needle), `blocking entry ritual styles removed: ${needle}`);
});

assert.match(css, /\.mirror-room::before,[\s\S]*?\.mirror-room::after \{[\s\S]*?pointer-events: none;/, "gallery light layers do not block interaction");
assert.match(css, /\.mirror-room::before \{[\s\S]*?gallery-room-arrive/, "room shell has a light gallery arrival");
assert.match(css, /\.mirror-room::after \{[\s\S]*?gallery-orbit-arrive/, "symbolic orbit is part of the first screen, not a loader");
assert.match(css, /\.hero-ritual \{[\s\S]*?gallery-symbol-arrive/, "symbol cluster arrives inside the usable first screen");
assert.match(css, /\.copy-block h1 \{[\s\S]*?font-size: clamp\(56px, 6\.2vw, 90px\);/, "home headline has stronger editorial scale");
assert.match(css, /\.work-panel \{[\s\S]*?box-shadow:[\s\S]*?inset 0 1px 0/, "compose panel has gallery-like depth without nesting cards");

assert.match(script, /function initFieldCanvas\(\) \{[\s\S]*?function draw\(\) \{[\s\S]*?ctx\.clearRect/, "field canvas still paints the low-light line field");
assert.match(script, /addEventListener\("resize", resize\);[\s\S]*?resize\(\);[\s\S]*?\}/, "field canvas repaints on resize");
assert.doesNotMatch(script, /requestAnimationFrame\(draw\)/, "field canvas does not run a continuous frame loop");
assert.doesNotMatch(script, /els\.reset\.addEventListener\("click", \(\) => \{[\s\S]*?playEntryRitual/, "brand reset no longer replays a blocking overlay");
assert.doesNotMatch(script, /event\.key === "Tab" && els\.entryRitual/, "keyboard focus is not trapped by a temporary intro");
assert.doesNotMatch(script, /maybePlayEntryRitual\(\)/, "boot does not trigger a first-visit overlay");

console.log("low-light first screen contract passed");
