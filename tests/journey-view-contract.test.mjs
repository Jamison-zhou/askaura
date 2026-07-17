import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addJourneyEcho } from "../assets/app/controllers/journey-controller.js";

const view = readFileSync(new URL("../assets/app/views/journey-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const sectionPatterns = {
  active: /recordSection\(labels\.active, "active"/,
  echoes: /recordSection\(title, "echoes"/,
  themes: /dataset\.journeySection = "themes"/,
  saved: /recordSection\(labels\.saved, "saved"/,
  legacy: /recordSection\(labels\.legacy, "legacy"/,
};
Object.entries(sectionPatterns).forEach(([section, pattern]) => assert.match(view, pattern, `journey renders ${section}`));
assert.match(view, /createElementNS\("http:\/\/www\.w3\.org\/2000\/svg", "svg"\)/, "journey map is derived as SVG nodes");
assert.doesNotMatch(view, /setAttribute\("data-(question|answer|note)"/, "private text never enters map attributes");
const choices = [...view.matchAll(/\["(changed|unchanged|not_done|passed)",/g)].map((match) => match[1]);
assert.deepEqual(choices, ["changed", "unchanged", "not_done", "passed"]);
for (const action of ["echo", "pause", "resume", "close", "edit"]) {
  assert.match(view, new RegExp(`actionButton\\([^\\n]*"${action}"|data\\.journeyAction = action`), `journey supports ${action}`);
}
const closed = addJourneyEcho({ lifecycleState: "active" }, "passed", "", new Date("2026-07-17T00:00:00.000Z"));
assert.equal(closed.echoStatus, "passed");
assert.equal(closed.lifecycleState, "closed");
assert.match(css, /\.journey-record-actions button,[\s\S]*?color: var\(--obs-ink/, "journey actions inherit every observation theme");

console.log("journey view contract passed");
