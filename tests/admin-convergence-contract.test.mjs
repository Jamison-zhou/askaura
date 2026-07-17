import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../admin.html", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/admin-config/index.ts", import.meta.url), "utf8");
for (const phrase of ["服务健康", "Prompt Version", "Quality Logging", "Safety Scan", "System Convergence V1", "Rollback Note", "使用量", "失败率", "延迟区间"]) {
  assert.match(html, new RegExp(phrase), `admin exposes ${phrase}`);
}
for (const editable of ["llm.provider", "llm.model", "models.basic.model", "models.pro.model"]) {
  assert.doesNotMatch(html, new RegExp(`name="${editable.replaceAll(".", "\\.")}"`), `${editable} is not editable`);
}
assert.match(edge, /function effectiveRouteStatus\(\)/);
assert.match(edge, /provider: "deepseek"/);
assert.match(edge, /basicModel: "deepseek-v4-flash"/);
assert.match(edge, /proModel: "deepseek-v4-pro"/);
assert.match(edge, /proEnabled: false/);

console.log("admin convergence contract passed");
