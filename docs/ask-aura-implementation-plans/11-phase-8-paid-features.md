# Phase 8: Paid Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add paid AskAura depth features without letting the browser choose paid model access, without weakening the free core, and without selling deterministic outcomes.

**Architecture:** Phase 8 is split into 8A and 8B. 8A builds server-owned entitlements, usage ledgers, and model-route gating before any payment checkout exists. 8B wires a selected payment provider through signed webhooks into those entitlements.

**Tech Stack:** Static HTML/CSS/JS, Supabase Auth/REST, Supabase Edge Functions, RLS, DeepSeek model routing, admin runtime config, provider-specific payment webhooks, Node `.mjs` contract tests, HTTP and browser smoke tests.

---

## Current Decision

Do Phase 8A first.

Do not add live checkout, payment buttons, or subscription copy until a payment provider is chosen and its refund/cancel/tax flow is accepted.

Recommended provider decision point:

- Stripe: strongest default if the product can use Stripe in the target market.
- Paddle or Lemon Squeezy: consider if merchant-of-record handling is required.
- WeChat/Alipay native payment: only consider with a separate China compliance/payment operations plan.

This plan intentionally keeps provider code behind an adapter so the entitlement model does not depend on one provider.

## Product Boundaries

- Free core remains useful: one reflective reading path, local history, basic follow-up, and core daily use must not feel broken.
- Paid unlocks depth, history, convenience, and higher usage limits.
- Paid never unlocks authority, certainty, or emotional pressure.
- Never sell fortune changing, deterministic future prediction, reunion probability, wealth/luck packages, master blessing, legal/medical/financial certainty, or guaranteed relationship outcomes.
- Paid copy must say "更深入整理 / longer review / more saved context", not "更准 / 更灵 / 改变结果".

## Risk Register

| Risk | Why It Matters | Required Guard |
| --- | --- | --- |
| Frontend-forced pro tier | Current `resolveModelRoute()` accepts `req.tier`; once `models.pro.enabled` is true, any browser can request pro | `reading` must resolve user entitlement server-side before choosing `pro` |
| Payment provider not selected | Checkout, webhook signature, refunds, invoices, and tax differ by provider | Write adapter interface first; no live checkout before provider selection |
| Refund/cancel not reflected | User may lose trust or get billed without access state matching payment state | Webhook events must update entitlement state and preserve audit events |
| Duplicate or replayed webhooks | Payment providers retry events, and attackers may replay old payloads | Store provider event ids, reject stale timestamps, and make every update idempotent |
| Raw private content in billing/usage logs | Payment and analytics data can become privacy exposure | Usage ledger stores route, tier, token caps, status, and record id only; no full question or generated answer |
| Free value collapse | Over-gating core flows can make the product feel like a paywall | Gated features are depth/convenience only |
| Content overpromise | Paid plan can accidentally sound like fortune-telling | Contract test scans paid copy and prompts for forbidden terms |
| RLS bypass | Entitlements are sensitive and billing-linked | Direct client writes are denied; service role functions own provider updates |
| Webhook forgery | Fake paid state can create free pro access | Provider webhook must verify signature before any write |
| Cost spike | Pro model and thinking mode are expensive | Server-owned limits, daily/monthly usage counters, and admin kill switch |
| Rollback difficulty | Payment bugs are high trust failures | Admin disables pro models and paid UI; webhook can stop granting new entitlements |

## File Structure

- Create: `supabase/migrations/202606030012_askaura_paid_entitlements.sql`
  - Stores user-owned plan state, provider ids, status, periods, webhook event audit rows, and service-owned usage events.
- Create: `supabase/functions/_shared/entitlements.ts`
  - Reads the authenticated user and returns `free`, `trial`, or `pro` capability flags.
- Modify: `supabase/functions/_shared/model-router.ts`
  - Accepts a server-owned entitlement tier instead of trusting `req.tier`.
- Modify: `supabase/functions/reading/index.ts`
  - Resolves authenticated entitlement before calling `resolveModelRoute()`.
- Create: `supabase/functions/billing-webhook/index.ts`
  - Handles provider webhook events after signature verification.
- Create: `supabase/functions/billing-portal/index.ts`
  - Creates checkout/customer-portal sessions only after provider selection.
- Modify: `supabase/functions/_shared/runtime-config.ts`
  - Adds paid feature flags and usage limits.
- Modify: `supabase/functions/admin-config/index.ts`
  - Allows admins to disable paid UI/pro routing and lower limits.
- Modify: `assets/app/sync.js`
  - Adds `loadEntitlement()` and `loadUsageSummary()` wrappers.
- Modify: `index.html`
  - Adds account-plan status, disabled paid entry states, and non-coercive upgrade copy.
- Modify: `styles.css`
  - Adds compact plan/limit UI styles.
- Add: `tests/phase8-paid-entitlements-contract.test.mjs`
  - Locks schema, RLS, model gating, webhook signature requirement, and copy boundaries.

---

## Current Status

- [x] Phase 8A implementation plan written.
- [x] Entitlement, usage, and billing event schema deployed.
- [x] Server-owned entitlement resolver added.
- [x] Model router no longer trusts browser `tier` for pro access.
- [x] Runtime paid/pro model kill switches added.
- [x] Provider-neutral signed webhook skeleton deployed.
- [x] Account plan status UI deployed without checkout.
- [x] Contract tests, full local tests, HTTP smoke, and browser smoke passed.
- [ ] Phase 8B checkout/customer portal is intentionally not implemented until the payment provider and refund/cancel flow are selected.

---

## Task 1: Contract Test First

**Files:**
- Add: `tests/phase8-paid-entitlements-contract.test.mjs`

- [ ] Add a test that checks Phase 8 cannot be marked done unless:
  - `askaura_entitlements` exists;
  - `askaura_billing_events` exists;
  - `askaura_usage_events` exists;
  - direct entitlement insert/update/delete is blocked by RLS;
  - `reading/index.ts` imports an entitlement resolver;
  - `model-router.ts` does not trust browser `req.tier` by itself;
  - `billing-webhook/index.ts` verifies a provider signature before writing;
  - `index.html` paid copy does not contain forbidden promise words.

Use this skeleton:

```js
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const migration = read("supabase/migrations/202606030012_askaura_paid_entitlements.sql");
assert.match(migration, /create table if not exists public\.askaura_entitlements/);
assert.match(migration, /create table if not exists public\.askaura_billing_events/);
assert.match(migration, /create table if not exists public\.askaura_usage_events/);
assert.match(migration, /enable row level security/);
assert.match(migration, /for insert\s+with check \(false\)/i);
assert.match(migration, /for update\s+using \(false\)/i);
assert.match(migration, /for delete\s+using \(false\)/i);

assert.ok(existsSync("supabase/functions/_shared/entitlements.ts"));

const reading = read("supabase/functions/reading/index.ts");
assert.match(reading, /resolveEntitlement/);
assert.match(reading, /entitlementTier/);

const router = read("supabase/functions/_shared/model-router.ts");
assert.doesNotMatch(router, /const requestedTier = req\.tier === "pro"/);
assert.match(router, /requestedTier: ModelTier/);

const webhook = read("supabase/functions/billing-webhook/index.ts");
assert.match(webhook, /verifyWebhookSignature/);
assert.match(webhook, /signature/i);
assert.match(webhook, /provider_event_id/);
assert.match(webhook, /idempot/i);
assert.match(webhook, /askaura_entitlements/);

const html = read("index.html");
for (const word of ["更准", "更灵", "改运", "复合概率", "财富运", "大师加持", "guarantee"]) {
  assert.equal(html.includes(word), false, `forbidden paid copy: ${word}`);
}
```

Run:

```powershell
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected before implementation: FAIL.

## Task 2: Entitlement And Usage Schema

**Files:**
- Add: `supabase/migrations/202606030012_askaura_paid_entitlements.sql`

- [ ] Create service-owned entitlement and usage tables:

```sql
create table if not exists public.askaura_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'trial', 'pro')),
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'refunded')),
  provider text not null default 'manual' check (provider in ('manual', 'stripe', 'paddle', 'lemonsqueezy', 'other')),
  provider_customer_id text not null default '',
  provider_subscription_id text not null default '',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.askaura_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('reading', 'followup', 'weekly', 'export', 'share', 'portal')),
  entry text not null default '',
  tier text not null default 'basic' check (tier in ('basic', 'pro')),
  model text not null default '',
  max_tokens integer not null default 0,
  status text not null default 'ok' check (status in ('ok', 'blocked', 'error')),
  record_id text not null default '',
  request_id text not null default gen_random_uuid()::text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.askaura_billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('manual', 'stripe', 'paddle', 'lemonsqueezy', 'other')),
  provider_event_id text not null,
  event_type text not null default '',
  user_id uuid references auth.users(id) on delete set null,
  provider_customer_id text not null default '',
  provider_subscription_id text not null default '',
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'error')),
  error text not null default '',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload_summary jsonb not null default '{}'::jsonb,
  unique (provider, provider_event_id)
);

create index if not exists askaura_entitlements_status_idx
  on public.askaura_entitlements (status, plan);

create index if not exists askaura_usage_events_user_created_idx
  on public.askaura_usage_events (user_id, created_at desc);

create index if not exists askaura_billing_events_user_received_idx
  on public.askaura_billing_events (user_id, received_at desc);

alter table public.askaura_entitlements enable row level security;
alter table public.askaura_usage_events enable row level security;
alter table public.askaura_billing_events enable row level security;

create policy "askaura_entitlements_select_own"
  on public.askaura_entitlements
  for select
  using (auth.uid() = user_id);

create policy "askaura_entitlements_no_direct_insert"
  on public.askaura_entitlements
  for insert
  with check (false);

create policy "askaura_entitlements_no_direct_update"
  on public.askaura_entitlements
  for update
  using (false)
  with check (false);

create policy "askaura_entitlements_no_direct_delete"
  on public.askaura_entitlements
  for delete
  using (false);

create policy "askaura_usage_events_select_own"
  on public.askaura_usage_events
  for select
  using (auth.uid() = user_id);

create policy "askaura_usage_events_no_direct_insert"
  on public.askaura_usage_events
  for insert
  with check (false);

create policy "askaura_usage_events_no_direct_update"
  on public.askaura_usage_events
  for update
  using (false)
  with check (false);

create policy "askaura_usage_events_no_direct_delete"
  on public.askaura_usage_events
  for delete
  using (false);

create policy "askaura_billing_events_no_direct_select"
  on public.askaura_billing_events
  for select
  using (false);

create policy "askaura_billing_events_no_direct_insert"
  on public.askaura_billing_events
  for insert
  with check (false);

create policy "askaura_billing_events_no_direct_update"
  on public.askaura_billing_events
  for update
  using (false)
  with check (false);

create policy "askaura_billing_events_no_direct_delete"
  on public.askaura_billing_events
  for delete
  using (false);
```

Run:

```powershell
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected: still FAIL until entitlement resolver and routing changes exist.

## Task 3: Server-Owned Entitlement Resolver

**Files:**
- Add: `supabase/functions/_shared/entitlements.ts`

- [ ] Add a resolver that treats anonymous users as free and active `pro`/`trial` rows as paid:

```ts
import type { ModelTier } from "./types.ts";
import { DenoEnv } from "./llm.ts";

export type EntitlementPlan = "free" | "trial" | "pro";
export type EntitlementStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled" | "refunded";

export type EntitlementSnapshot = {
  userId: string;
  plan: EntitlementPlan;
  status: EntitlementStatus;
  modelTier: ModelTier;
  canUsePro: boolean;
};

export async function fetchUserId(baseUrl: string, anonKey: string, authHeader: string | null): Promise<string> {
  if (!authHeader) return "";
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authHeader,
    },
  });
  if (!response.ok) return "";
  const user = await response.json().catch(() => null) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : "";
}

export async function resolveEntitlement(env: DenoEnv, authHeader: string | null): Promise<EntitlementSnapshot> {
  const baseUrl = env.get("SUPABASE_URL") || "";
  const anonKey = env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const userId = baseUrl && anonKey ? await fetchUserId(baseUrl, anonKey, authHeader) : "";
  if (!userId || !serviceKey) {
    return { userId, plan: "free", status: "inactive", modelTier: "basic", canUsePro: false };
  }

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "plan,status,current_period_end",
    limit: "1",
  });
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/rest/v1/askaura_entitlements?${params}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!response.ok) {
    return { userId, plan: "free", status: "inactive", modelTier: "basic", canUsePro: false };
  }

  const rows = await response.json().catch(() => []) as Array<{
    plan?: EntitlementPlan;
    status?: EntitlementStatus;
    current_period_end?: string | null;
  }>;
  const row = rows[0];
  const periodActive = !row?.current_period_end || new Date(row.current_period_end).getTime() > Date.now();
  const active = periodActive && (
    (row?.plan === "pro" && row?.status === "active") ||
    (row?.plan === "trial" && row?.status === "trialing")
  );

  return {
    userId,
    plan: row?.plan || "free",
    status: row?.status || "inactive",
    modelTier: active ? "pro" : "basic",
    canUsePro: active,
  };
}
```

## Task 4: Model Router Gating

**Files:**
- Modify: `supabase/functions/_shared/model-router.ts`

- [ ] Change `resolveModelRoute()` so the caller passes a server-owned tier:

```ts
export function resolveModelRoute(
  req: AnyReadingRequest,
  config: RuntimeConfig,
  requestedTier: ModelTier,
): ModelRoute {
  const tier: ModelTier = requestedTier === "pro" && isProAllowed(config) ? "pro" : "basic";
  const entry = normalizeEntry(req);
  const tierConfig = readTierConfig(config, tier);
  const model = normalizeModel(tier);
  const entryCap = ENTRY_TOKEN_CAP[entry];
  const tierCap = tier === "pro" ? 3072 : 1800;
  const fallbackTokens = Math.min(entryCap, tier === "pro" ? 2200 : 1200);
  const maxTokens = Math.min(
    entryCap,
    clampNumber(tierConfig.maxTokens, fallbackTokens, 256, tierCap),
  );
  const thinkingEnabled = tier === "pro" && tierConfig.thinking === true;

  return {
    provider: "deepseek",
    model,
    tier,
    entry,
    thinking: thinkingEnabled ? { type: "enabled" } : { type: "disabled" },
    reasoningEffort: thinkingEnabled ? (tierConfig.reasoningEffort || "high") : undefined,
    maxTokens,
  };
}
```

Run:

```powershell
node --experimental-vm-modules tests/phase1-5-model-router.test.mjs
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected: Phase 1.5 test needs updating only if its imports call the old function signature. Phase 8 still FAILS until `reading` passes entitlement.

## Task 5: Reading Function Entitlement Enforcement

**Files:**
- Modify: `supabase/functions/reading/index.ts`

- [ ] Resolve entitlement before routing:

```ts
import { resolveEntitlement } from "../_shared/entitlements.ts";
```

Then replace route creation with:

```ts
const entitlement = await resolveEntitlement(env, req.headers.get("Authorization"));
const route = resolveModelRoute(reqBody, runtimeConfig, entitlement.modelTier);
```

- [ ] Add usage logging after route creation with service role only. Store route metadata, not the original question or generated answer.

Verification:

```powershell
node --experimental-vm-modules tests/phase1-5-model-router.test.mjs
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected: PASS for model gating checks.

## Task 6: Runtime Config For Paid Limits

**Files:**
- Modify: `supabase/functions/_shared/runtime-config.ts`
- Modify: `supabase/functions/admin-config/index.ts`
- Modify: `admin.html`

- [ ] Add config keys:

```ts
paid?: {
  enabled?: boolean;
  proModelEnabled?: boolean;
  freeDailyFollowups?: number;
  proDailyFollowups?: number;
  freeMonthlyExports?: number;
  proMonthlyExports?: number;
};
```

Default:

```ts
paid: {
  enabled: false,
  proModelEnabled: false,
  freeDailyFollowups: 3,
  proDailyFollowups: 20,
  freeMonthlyExports: 3,
  proMonthlyExports: 50,
}
```

- [ ] Admin save sanitization must accept only booleans and finite numbers in safe ranges.

Verification:

```powershell
node tests/phase1-5-model-router.test.mjs
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected: PASS.

## Task 7: Billing Webhook Adapter

**Files:**
- Add: `supabase/functions/billing-webhook/index.ts`

- [ ] Add provider-neutral handler:

```ts
type BillingEvent =
  | { type: "subscription.active"; userId: string; provider: string; customerId: string; subscriptionId: string; periodEnd: string }
  | { type: "subscription.canceled"; userId: string; provider: string; customerId: string; subscriptionId: string; periodEnd: string }
  | { type: "subscription.refunded"; userId: string; provider: string; customerId: string; subscriptionId: string };
```

- [ ] Implement `verifyWebhookSignature(request, rawBody, env)` before parsing event.
- [ ] Reject stale webhook timestamps according to the selected provider's tolerance.
- [ ] Store `(provider, provider_event_id)` in `askaura_billing_events` before entitlement mutation.
- [ ] If `(provider, provider_event_id)` already exists, return success without mutating entitlement again.
- [ ] For active events, upsert `plan='pro'`, `status='active'`, provider ids, and period end.
- [ ] For canceled events, set `cancel_at_period_end=true` and preserve access until period end.
- [ ] For refunded events, set `status='refunded'` and `plan='free'`.
- [ ] Return `400` if signature is missing or invalid.

Verification:

```powershell
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected: PASS for webhook static contract.

## Task 8: Account Plan UI Without Checkout

**Files:**
- Modify: `assets/app/sync.js`
- Modify: `index.html`
- Modify: `styles.css`

- [ ] Add a signed-in account plan row showing:
  - current plan: free/pro/trial;
  - monthly usage summary;
  - paid features marked "not open yet" when `paid.enabled=false`;
  - no live payment button until billing portal is implemented.

Copy examples:

```txt
免费版：保留核心解读、回看和基础追问。
Pro：更长的月度整理、更多追问额度、更多导出与私密链接管理。
付费入口暂未开放。
```

Do not use:

```txt
更准
更灵
改运
复合概率
财富运
大师加持
```

Verification:

```powershell
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected: PASS.

## Task 9: Billing Portal Only After Provider Selection

**Files:**
- Add: `supabase/functions/billing-portal/index.ts`
- Modify: `assets/app/sync.js`
- Modify: `index.html`

- [ ] Start this task only after the provider is selected.
- [ ] Checkout creation must require a signed-in user.
- [ ] Checkout creation must create or reuse a provider customer id server-side.
- [ ] Customer portal must be server-created; the browser never receives provider secrets.
- [ ] The UI may show a payment button only when runtime config has `paid.enabled=true`.

Provider-specific implementation notes:

- Stripe: verify `stripe-signature`; handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and refund-relevant invoice/charge events.
- Paddle: verify Paddle signature; map subscription active/canceled/payment refunded events.
- Lemon Squeezy: verify `X-Signature`; map subscription created/updated/cancelled and order refunded events.

Verification:

```powershell
node --experimental-vm-modules tests/phase8-paid-entitlements-contract.test.mjs
```

Expected: PASS, plus provider sandbox webhook smoke.

## Task 10: HTTP Smoke

**Files:**
- No new files.

- [ ] Push migration:

```powershell
supabase db push --linked
```

- [ ] Deploy functions:

```powershell
supabase functions deploy reading --project-ref oeqekrlodqxjlakdjqpu --no-verify-jwt
supabase functions deploy billing-webhook --project-ref oeqekrlodqxjlakdjqpu --no-verify-jwt
```

- [ ] Verify anonymous/basic request cannot become pro:

Expected headers:

```txt
X-AskAura-Tier: basic
X-AskAura-Thinking: disabled
```

- [ ] Verify signed-in free user with browser-sent `tier: "pro"` still receives:

```txt
X-AskAura-Tier: basic
X-AskAura-Thinking: disabled
```

- [ ] Verify service-owned active entitlement receives pro only when runtime config also enables pro:

```txt
X-AskAura-Tier: pro
X-AskAura-Thinking: enabled
```

- [ ] Verify forged webhook without signature returns `400`.
- [ ] Verify replaying the same valid webhook twice leaves one billing event and one entitlement state.
- [ ] Verify usage rows contain no raw question, answer, or follow-up text.

## Task 11: Browser Smoke

**Files:**
- No new files.

- [ ] Deploy frontend:

```powershell
npx vercel deploy --prod --yes
```

- [ ] Open production and verify:
  - free account shows useful core flows;
  - plan status renders without layout overflow at 1440px and 390px;
  - no checkout button appears while `paid.enabled=false`;
  - paid copy avoids forbidden promise words;
  - existing Phase 0-7 panels still open.

## Task 12: Rollback

**Files:**
- Modify only runtime config unless schema rollback is explicitly required.

- [ ] Disable paid UI and pro model access:

```json
{
  "paid": {
    "enabled": false,
    "proModelEnabled": false
  },
  "models": {
    "pro": {
      "enabled": false,
      "thinking": false
    }
  }
}
```

- [ ] Redeploy frontend only if paid UI has already shipped visible checkout elements.
- [ ] Do not delete entitlement rows during rollback; preserve audit history.

---

## Completion Criteria

- A browser cannot unlock `pro` by sending `tier: "pro"`.
- Active paid/trial entitlement is required for `pro`, and runtime config must also allow it.
- Webhook writes are rejected without a valid provider signature.
- Webhook processing is idempotent by provider event id.
- Direct client writes to entitlements and usage events are blocked.
- Usage/cost logs do not store raw private questions or full generated answers.
- Free core remains usable.
- Paid copy sells depth/history/convenience only.
- Provider sandbox webhook, HTTP route smoke, and desktop/mobile browser smoke pass.
