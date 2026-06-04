import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/202606030012_askaura_paid_entitlements.sql");
assert.match(migration, /create table if not exists public\.askaura_entitlements/, "paid entitlements table exists");
assert.match(migration, /create table if not exists public\.askaura_billing_events/, "billing event audit table exists");
assert.match(migration, /create table if not exists public\.askaura_usage_events/, "usage event table exists");
assert.match(migration, /enable row level security/, "paid tables enable RLS");
assert.match(migration, /unique \(provider, provider_event_id\)/, "billing events are idempotent by provider event id");
assert.match(migration, /for insert\s+with check \(false\)/i, "direct inserts are blocked");
assert.match(migration, /for update\s+using \(false\)/i, "direct updates are blocked");
assert.match(migration, /for delete\s+using \(false\)/i, "direct deletes are blocked");

assert.ok(
  existsSync(new URL("../supabase/functions/_shared/entitlements.ts", import.meta.url)),
  "entitlement resolver exists",
);

const entitlement = read("supabase/functions/_shared/entitlements.ts");
assert.match(entitlement, /resolveEntitlement/, "entitlement resolver is exported");
assert.match(entitlement, /recordUsageEvent/, "usage logging helper is exported");
assert.doesNotMatch(entitlement, /question|answer|followupQuestion/, "entitlement helper does not log raw private text fields");

const reading = read("supabase/functions/reading/index.ts");
assert.match(reading, /resolveEntitlement/, "reading function resolves entitlement server-side");
assert.match(reading, /entitlement\.modelTier/, "reading route uses server-owned entitlement tier");
assert.match(reading, /recordUsageEvent/, "reading function records usage metadata");

const router = read("supabase/functions/_shared/model-router.ts");
assert.doesNotMatch(router, /const requestedTier = req\.tier === "pro"/, "router no longer trusts browser tier directly");
assert.match(router, /requestedTier: ModelTier/, "router accepts server-owned requested tier");
assert.match(router, /paid\?\.proModelEnabled === true/, "pro route also requires paid runtime gate");

const runtimeConfig = read("supabase/functions/_shared/runtime-config.ts");
assert.match(runtimeConfig, /paid\?:/, "runtime config includes paid limits");
assert.match(runtimeConfig, /proModelEnabled: false/, "default config disables pro model gate");

const adminConfig = read("supabase/functions/admin-config/index.ts");
assert.match(adminConfig, /paid\.proModelEnabled/, "admin config sanitizes pro model gate");
assert.match(adminConfig, /freeDailyFollowups/, "admin config sanitizes paid usage limits");

const webhook = read("supabase/functions/billing-webhook/index.ts");
assert.match(webhook, /verifyWebhookSignature/, "billing webhook verifies signatures");
assert.match(webhook, /signature/i, "billing webhook requires a signature");
assert.match(webhook, /x-askaura-billing-timestamp/, "billing webhook checks timestamp freshness");
assert.match(webhook, /provider_event_id/, "billing webhook stores provider event id");
assert.match(webhook, /idempot/i, "billing webhook exposes idempotent replay handling");
assert.match(webhook, /askaura_entitlements/, "billing webhook writes entitlements");
assert.match(webhook, /askaura_billing_events/, "billing webhook writes event audit rows");

const sync = read("assets/app/sync.js");
assert.match(sync, /loadEntitlement/, "sync client exposes entitlement read");
assert.match(sync, /loadUsageSummary/, "sync client exposes usage summary read");
assert.doesNotMatch(sync, /method:\s*"POST"[\s\S]{0,160}askaura_entitlements/, "browser does not write entitlements");

const config = read("supabase/config.toml");
assert.match(config, /\[functions\.billing-webhook\][\s\S]*verify_jwt = false/, "billing webhook is configured for signature auth");

const html = read("index.html");
assert.match(html, /id="plan-status"/, "account panel shows plan status");
assert.match(html, /planPaidClosed/, "paid entry remains closed until provider selection");
for (const word of ["更准", "更灵", "改运", "复合概率", "财富运", "大师加持", "guarantee"]) {
  assert.equal(html.includes(word), false, `forbidden paid copy: ${word}`);
}

console.log("phase8 paid entitlement contract passed");
