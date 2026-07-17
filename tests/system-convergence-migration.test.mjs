import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/202607170001_askaura_system_convergence_v1.sql", import.meta.url), "utf8");
for (const column of [
  "lifecycle_state",
  "selected_insight",
  "action_theme",
  "echo_due_at",
  "echo_status",
  "echo_note",
  "temporary_expires_at",
  "source_version",
]) assert.match(sql, new RegExp(column), `migration contains ${column}`);
assert.match(sql, /askaura_records_journey_idx/, "journey lookup has an index");
assert.doesNotMatch(sql, /askaura_product_events/, "journey migration does not create a second analytics system");
console.log("system convergence migration contract passed");
