import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { routeQuestionSafety } from "../assets/app/safety-router.js";

assert.deepEqual(routeQuestionSafety("我想伤害自己"), { route: "support", reason: "self-harm" });
assert.deepEqual(routeQuestionSafety("这份合同一定能赢吗"), { route: "professional-boundary", reason: "legal" });
assert.deepEqual(routeQuestionSafety("我该不该和同事谈谈"), { route: "observe", reason: "" });

const backend = readFileSync(new URL("../supabase/functions/_shared/safety-router.ts", import.meta.url), "utf8");
const reading = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");
assert.match(backend, /routeQuestionSafety/, "backend owns the same safety boundary");
assert.match(reading, /immediate_support/, "reading endpoint exposes the support route");
assert.match(reading, /professional_boundary/, "reading endpoint exposes the professional boundary route");
assert.ok(
  reading.indexOf("const safetyRoute = routeQuestionSafety") < reading.indexOf("await recordUsageEvent"),
  "safety routing runs before usage logging",
);
assert.ok(
  reading.indexOf("const safetyRoute = routeQuestionSafety") < reading.indexOf("provider = createProvider"),
  "safety routing runs before provider creation",
);
console.log("safety router tests passed");
