import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveCompanionSnapshot } from "../assets/app/companion.js";

const migration = readFileSync(new URL("../supabase/migrations/202606030011_askaura_companion_profile.sql", import.meta.url), "utf8");
const sync = readFileSync(new URL("../assets/app/sync.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const companion = readFileSync(new URL("../assets/app/companion.js", import.meta.url), "utf8");
const companionUi = [
  html.slice(html.indexOf('id="companion-panel"'), html.indexOf('<script type="module">')),
  ...Array.from(html.matchAll(/companion[A-Za-z]+: "[^"]+"/g)).map((match) => match[0]),
].join("\n");

assert.match(migration, /create table if not exists public\.askaura_companion_profiles/, "companion profile table exists");
assert.match(migration, /alter table public\.askaura_companion_profiles enable row level security/, "companion profile table enables RLS");
assert.match(migration, /auth\.uid\(\) = user_id/, "companion profile is user-owned");
assert.match(migration, /quiet_flags jsonb not null default '\[\]'::jsonb/, "quiet flags are stored separately from public history");

assert.match(sync, /loadCompanionProfile/, "sync exposes companion profile loading");
assert.match(sync, /saveCompanionProfile/, "sync exposes companion profile saving");
assert.match(sync, /askaura_companion_profiles/, "sync uses the companion profile table");

assert.match(html, /id="companion-btn"/, "utility rail exposes companion entry");
assert.match(html, /id="companion-panel"/, "front-end includes companion panel");
assert.match(html, /id="companion-theme-map"/, "front-end shows a personal theme map");
assert.match(css, /\.companion-panel/, "companion panel has styling");

assert.match(companion, /export function deriveCompanionSnapshot/, "companion module exports the snapshot function");
assert.doesNotMatch(`${companionUi}\n${companion}`, /命中注定|算命|转运|改运|fortune|fate|prediction|streak/i, "companion copy avoids dependency and prediction language");

const oldDate = new Date("2026-04-01T00:00:00.000Z");
const now = new Date("2026-06-03T00:00:00.000Z");
const snapshot = deriveCompanionSnapshot([
  {
    mode: "tarot",
    action: "Write one factual sentence.",
    actionStatus: "done",
    cards: [{ name: "The Star" }],
    createdAt: oldDate.toISOString(),
  },
  {
    mode: "meihua",
    action: "Write one factual sentence.",
    actionStatus: "not_done",
    gua: { name: "Wind" },
    createdAt: "2026-06-01T00:00:00.000Z",
  },
], now);

assert.equal(snapshot.totalRecords, 2, "snapshot counts usable records");
assert.equal(snapshot.modeCounts.tarot, 1, "snapshot counts modes");
assert.equal(snapshot.actionStatusCounts.done, 1, "snapshot counts action statuses");
assert.equal(snapshot.topSymbols[0].name, "The Star", "snapshot extracts symbols");
assert.ok(snapshot.actionWords.some((item) => item.word.toLowerCase() === "write"), "snapshot extracts action words");
assert.ok(snapshot.oneMonthEcho, "snapshot returns one-month echo when old history exists");

console.log("phase7 companion contract passed");
