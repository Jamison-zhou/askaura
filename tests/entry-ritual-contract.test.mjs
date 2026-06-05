import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);

assert.ok(scriptMatch, "index module script exists");
assert.ok(!html.includes("AskAura / Symbolic interpretation"), "home screen does not keep a low-value top eyebrow");

const script = scriptMatch[1];

assert.match(css, /:root \{[\s\S]*--light-cool:/, "low-light redesign tokens exist");
assert.match(html, /styles\.css\?v=20260605-low-light-redesign-2/, "low-light redesign busts the stylesheet cache");

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
assert.match(css, /\.side-rail \{[\s\S]*?padding:[\s\S]*?clamp\(20px, 3dvh, 30px\)[\s\S]*?clamp\(22px, 2\.4vw, 34px\);/, "desktop side rail keeps the brand away from the shell edge");
assert.match(css, /--surface-primary: rgba\(18, 21, 32, 0\.78\);/, "primary surface token keeps panels slightly brighter than the page");
assert.match(css, /--line-hair: rgba\(240, 237, 229, 0\.075\);/, "hairline token exists for low-light borders");
assert.match(css, /background-size:[\s\S]*92px 92px,[\s\S]*92px 92px,/, "background uses a quiet grid rather than star decoration");
assert.match(css, /\.hero-ritual \{[\s\S]*?opacity: 0\.36;/, "symbol cluster is subdued behind the usable surface");
assert.match(css, /\.copy-block h1 \{[\s\S]*?font-size: clamp\(58px, 5\.7vw, 96px\);/, "home headline has stronger editorial scale");
assert.match(css, /\.work-panel \{[\s\S]*?box-shadow:[\s\S]*?inset 0 1px 0/, "compose panel has gallery-like depth without nesting cards");
assert.match(css, /\.compose-panel \{[\s\S]*?var\(--shadow-soft\)/, "compose panel is the primary low-light work surface");
assert.match(css, /\.mode-card-grid \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);[\s\S]*?gap: 14px;/, "mode cards use a three-column desktop grid");
assert.match(css, /\.mode-card\.is-selected \{[\s\S]*?border-color: rgba\(203, 180, 134, 0\.52\);/, "selected mode card gets restrained bronze emphasis");
assert.match(css, /\.result-layout \{[\s\S]*?grid-template-columns: minmax\(220px, 0\.24fr\) minmax\(0, 1fr\);/, "result layout keeps the symbol rail secondary");
assert.match(css, /\.core-conclusion \{[\s\S]*?border: 1px solid var\(--line-lit\);/, "current thread is a reading surface, not a verdict card");
assert.match(css, /\.action-board section:first-child \{[\s\S]*?rgba\(203, 180, 134, 0\.30\)/, "today action is the strongest result card");
assert.match(css, /\.answer-panel\.is-dual-report \.result-layout \{[\s\S]*?grid-template-columns: minmax\(280px, 0\.30fr\) minmax\(0, 1fr\);/, "dual report keeps synthesis emphasis in the reading column");
assert.match(css, /\.action-sentence \{[\s\S]*?opacity: 1;[\s\S]*?transform: translateY\(0\);/, "stored action sentence remains visible without streaming animation state");
assert.match(css, /@media \(min-width: 2100px\) \{[\s\S]*?--shell-max: 1840px;/, "large desktop widths are capped instead of stretching endlessly");
assert.match(css, /@media \(max-width: 780px\) \{[\s\S]*?\.mode-card-grid,[\s\S]*?\.result-layout \{[\s\S]*?grid-template-columns: 1fr;/, "mode cards and result layout stack at narrow widths");
assert.match(css, /--control-bg: rgba\(240, 237, 229, 0\.032\);[\s\S]*--control-border-active: rgba\(156, 122, 74, 0\.34\);/, "compact controls share AskAura tokens");
assert.match(css, /\.question-examples button,[\s\S]*?\.history-favorite \{[\s\S]*?border: 1px solid var\(--control-border\);[\s\S]*?background: var\(--control-bg\);/, "compact option controls use one shared style");
assert.match(css, /\.utility-sheet input \{[\s\S]*?border: 1px solid var\(--control-border\);[\s\S]*?background:[\s\S]*rgba\(3, 4, 8, 0\.42\);/, "utility panel inputs stay in the dark control system");
assert.match(css, /\.ritual-stepper span\.is-active \{[\s\S]*?text-shadow: 0 0 18px rgba\(156, 122, 74, 0\.18\);/, "ritual stepper active state uses a cheap visual emphasis instead of animation");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "low-light redesign supports reduced motion");

assert.match(script, /function initFieldCanvas\(\) \{[\s\S]*?function draw\(\) \{[\s\S]*?ctx\.clearRect/, "field canvas still paints the low-light line field");
assert.match(script, /addEventListener\("resize", resize\);[\s\S]*?resize\(\);[\s\S]*?\}/, "field canvas repaints on resize");
assert.doesNotMatch(script, /requestAnimationFrame\(draw\)/, "field canvas does not run a continuous frame loop");
assert.doesNotMatch(script, /els\.reset\.addEventListener\("click", \(\) => \{[\s\S]*?playEntryRitual/, "brand reset no longer replays a blocking overlay");
assert.doesNotMatch(script, /event\.key === "Tab" && els\.entryRitual/, "keyboard focus is not trapped by a temporary intro");
assert.doesNotMatch(script, /maybePlayEntryRitual\(\)/, "boot does not trigger a first-visit overlay");

console.log("low-light first screen contract passed");
