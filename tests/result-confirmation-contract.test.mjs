import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appSource } from "./helpers/app-source.mjs";
import {
  confirmResultAction,
  confirmResultInsight,
  createTemporaryResult,
  resultStep,
} from "../assets/app/controllers/journey-controller.js";

const view = readFileSync(new URL("../assets/app/views/result-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const actions = ["confirm-insight", "accept-action", "edit-action", "save-observation", "leave-temporary", "expand-evidence"];
actions.forEach((action) => assert.match(appSource, new RegExp(`data-result-action="${action}"`), `result exposes ${action}`));
assert.match(appSource, /<details class="result-evidence"[\s\S]*id="result-evidence-text"/, "complete AI evidence is collapsed by default");
assert.match(view, /elements\.acceptAction\.disabled = failed \|\| step === "summary"/, "action acceptance waits for insight confirmation");

const temporary = createTemporaryResult({ id: "r1", action: "Write one honest sentence." }, new Date("2026-07-17T00:00:00.000Z"));
assert.equal(resultStep(temporary), "summary");
assert.throws(() => confirmResultAction(temporary, { action: temporary.action }), /insight_required/);
const withInsight = confirmResultInsight(temporary, "I need a clearer boundary.", new Date("2026-07-17T00:01:00.000Z"));
assert.equal(resultStep(withInsight), "insight-confirmed");
const active = confirmResultAction(withInsight, { action: temporary.action, actionTheme: "边界" }, new Date("2026-07-17T00:02:00.000Z"));
assert.equal(active.lifecycleState, "active");
assert.equal(resultStep(active), "action-confirmed");
assert.ok(active.echoDueAt);

const failureActions = [...appSource.matchAll(/data-failure-action="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(failureActions, ["retry", "later", "save-symbol", "edit-question"]);
assert.match(view, /setSuccessfulResultActions/, "successful-result controls share one disabled-state boundary");
assert.match(
  css,
  /\.result-confirmation textarea,[\s\S]*?\.result-confirmation input \{[\s\S]*?background: var\(--obs-surface-soft,[\s\S]*?color: var\(--obs-ink,/,
  "result workflow fields use the observation theme instead of browser defaults",
);
assert.match(
  css,
  /\.result-confirmation > button,[\s\S]*?\.result-confirmation-actions button,[\s\S]*?\.failure-actions button \{[\s\S]*?background: var\(--obs-surface-soft,[\s\S]*?color: var\(--obs-ink,/,
  "result workflow buttons stay legible on dark themes",
);

console.log("result confirmation contract passed");
