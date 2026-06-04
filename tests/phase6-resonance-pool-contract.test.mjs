import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/202606030010_askaura_resonance_pool.sql", import.meta.url), "utf8");
const fn = readFileSync(new URL("../supabase/functions/resonance-pool/index.ts", import.meta.url), "utf8");
const sync = readFileSync(new URL("../assets/app/sync.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");

assert.match(migration, /create table if not exists public\.askaura_resonance_submissions/, "resonance submissions use a dedicated table");
assert.match(migration, /create table if not exists public\.askaura_resonance_reactions/, "reactions use a dedicated table");
assert.match(migration, /alter table public\.askaura_resonance_submissions enable row level security/, "submissions enable RLS");
assert.match(migration, /alter table public\.askaura_resonance_reactions enable row level security/, "reactions enable RLS");
assert.match(migration, /auth\.uid\(\) = user_id/, "submission ownership is enforced");
assert.match(migration, /revoked_at timestamptz/, "submissions are revocable");
assert.match(migration, /anon_fingerprint text not null/, "reactions are anonymous");

assert.match(fn, /action === "submit"/, "function supports submit");
assert.match(fn, /action === "revoke"/, "function supports revoke");
assert.match(fn, /action === "list"/, "function supports list");
assert.match(fn, /action === "react"/, "function supports react");
assert.match(fn, /getOwnedRecord/, "submit verifies record ownership");
assert.match(fn, /redactSubmissionPayload/, "submit redacts private record data");
assert.match(fn, /sha256Hex/, "reaction fingerprints are hashed");
assert.doesNotMatch(fn, /user\.email|access_token|refresh_token|service_role/i, "public payload does not expose account tokens or email");

assert.match(sync, /submitResonance\(recordId/, "sync exposes submitResonance");
assert.match(sync, /revokeResonance\(id\)/, "sync exposes revokeResonance");
assert.match(sync, /loadResonancePool/, "sync exposes loadResonancePool");
assert.match(sync, /reactToResonance/, "sync exposes reactToResonance");
assert.doesNotMatch(sync, /askaura_resonance_submissions|askaura_resonance_reactions/, "browser sync does not directly access resonance tables");

assert.match(html, /id="resonance-submit-btn"/, "UI exposes explicit submit action");
assert.match(html, /id="resonance-open-btn"/, "UI exposes open-pool action");
assert.match(html, /id="resonance-panel"/, "UI includes read-only pool panel");
assert.match(html, /data-resonance-reaction/, "UI supports lightweight reactions");
assert.doesNotMatch(html, /lastQuestion[\s\S]{0,120}submitResonance/, "resonance submission must not send raw question from UI");
assert.match(css, /\.resonance-list/, "resonance list has styling");
assert.match(css, /\.resonance-item/, "resonance items have styling");

assert.match(config, /\[functions\.resonance-pool\][\s\S]*verify_jwt = false/, "resonance function uses custom auth handling");

console.log("phase6 resonance pool contract passed");
