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
assert.match(sql, /create table if not exists public\.askaura_product_events/, "migration creates the privacy-safe product event store");
assert.match(sql, /event_name text not null check/, "product events use an event-name allowlist");
assert.match(sql, /alter table public\.askaura_product_events enable row level security/, "product events enforce row-level security");
assert.doesNotMatch(sql, /for insert[\s\S]*askaura_product_events/i, "browser clients cannot insert product events directly");
console.log("system convergence migration contract passed");
