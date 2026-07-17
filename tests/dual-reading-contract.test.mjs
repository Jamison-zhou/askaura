import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const reading = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");
const dualPrompt = readFileSync(new URL("../supabase/functions/_shared/prompts/dual.ts", import.meta.url), "utf8");
const controller = readFileSync(new URL("../assets/app/controllers/observation-controller.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../assets/app/main.js", import.meta.url), "utf8");
const { buildDualReadingRequest } = await import("../assets/app/controllers/observation-controller.js");
const { buildDualPrompt } = await import("../supabase/functions/_shared/prompts/dual.ts");

assert.match(types, /mode:\s*"dual-reading"/);
assert.match(reading, /case\s+"dual-reading"/);
assert.match(dualPrompt, /\[SUMMARY\]/);
assert.match(dualPrompt, /\[TAROT_EVIDENCE\]/);
assert.match(dualPrompt, /\[GUA_EVIDENCE\]/);
assert.match(dualPrompt, /\[ACTION\]/);
assert.match(controller, /buildDualReadingRequest/);

const request = buildDualReadingRequest({
  question: "我该继续推进，还是先观察？",
  cards: [{ name: "Justice", label: "当下", position: "current", orientation: "upright" }],
  guaName: "节",
});
assert.equal(request.mode, "dual-reading");
assert.equal(request.entry, "dual");
const prompt = buildDualPrompt(request);
assert.match(prompt, /两个来源不代表更准确/);
assert.match(prompt, /我该继续推进/);

const dualBranch = main.slice(main.indexOf('else if (mode === "dual")'), main.indexOf('} else {', main.indexOf('else if (mode === "dual")')));
assert.equal((dualBranch.match(/await streamReading/g) || []).length, 1, "dual observation uses one model request");
console.log("dual reading contract passed");
