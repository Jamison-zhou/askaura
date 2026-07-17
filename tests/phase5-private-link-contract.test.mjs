import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appSource } from "./helpers/app-source.mjs";

const migration = readFileSync(new URL("../supabase/migrations/202606030009_askaura_share_links.sql", import.meta.url), "utf8");
const shareFunction = readFileSync(new URL("../supabase/functions/share-link/index.ts", import.meta.url), "utf8");
const sync = readFileSync(new URL("../assets/app/sync.js", import.meta.url), "utf8");
const html = appSource;
const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
const cors = readFileSync(new URL("../supabase/functions/_shared/cors.ts", import.meta.url), "utf8");

assert.match(migration, /create table if not exists public\.askaura_share_links/, "share links use a dedicated table");
assert.match(migration, /token_hash text not null unique/, "share tokens are stored as hashes");
assert.match(migration, /payload jsonb not null/, "share links store a cropped payload");
assert.match(migration, /revoked_at timestamptz/, "share links can be revoked");
assert.match(migration, /expires_at timestamptz/, "share links can expire");
assert.match(migration, /enable row level security/, "share links have RLS enabled");
assert.equal((migration.match(/using \(false\)|with check \(false\)/g) || []).length, 5, "direct table access is denied by RLS policies");

assert.match(shareFunction, /action === "get"[\s\S]*getShareLink/, "public read uses the share function");
assert.match(shareFunction, /fetchUser\(baseUrl, anonKey, request\.headers\.get\("Authorization"\)\)/, "create and revoke require a logged-in user");
assert.match(shareFunction, /user_id: `eq\.\$\{userId\}`/, "create verifies record ownership");
assert.match(shareFunction, /sha256Hex\(token\)/, "function hashes tokens before storage and lookup");
assert.match(shareFunction, /row\.revoked_at/, "revoked links no longer load");
assert.match(shareFunction, /Date\.parse\(row\.expires_at\) <= Date\.now\(\)/, "expired links no longer load");
assert.doesNotMatch(shareFunction, /user\.email|access_token|refresh_token/i, "public payload does not expose account tokens or email");

assert.match(sync, /createShareLink\(recordId/, "sync client exposes createShareLink");
assert.match(sync, /revokeShareLink\(id\)/, "sync client exposes revokeShareLink");
assert.match(sync, /loadShareLink\(token\)/, "sync client exposes loadShareLink");
assert.match(sync, /SHARE_LINK_FUNCTION = "\/functions\/v1\/share-link"/, "sync client calls only the Edge Function");
assert.doesNotMatch(sync, /askaura_share_links/, "browser sync does not directly access the private link table");

assert.match(html, /id="create-share-link-btn"/, "UI has an explicit private-link action");
assert.match(html, /id="revoke-share-link-btn"/, "UI can revoke the current link");
assert.match(html, /handleSharedResult\(\)/, "shared links open in a read-only flow");
assert.match(html, /new URLSearchParams\(location\.search\)\.get\("share"\)/, "front-end reads share token from URL");
assert.match(html, /includeQuestion: els\.shareIncludeQuestion\.checked/, "private link question sharing is explicit opt-in");
assert.match(html, /els\.save\.disabled = true/, "shared result cannot be saved back as a local result by default");

assert.match(config, /\[functions\.share-link\][\s\S]*verify_jwt = false/, "share-link function is configured for custom auth handling");
assert.match(cors, /x-askaura-origin/, "share-link create request custom origin header is allowed");

console.log("phase5 private link contract passed");
