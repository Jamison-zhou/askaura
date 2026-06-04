import { CORS_HEADERS, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { DenoEnv } from "../_shared/llm.ts";

type BillingEvent =
  | {
    type: "subscription.active";
    provider: "stripe" | "paddle" | "lemonsqueezy" | "other";
    providerEventId: string;
    userId: string;
    customerId: string;
    subscriptionId: string;
    periodEnd: string;
  }
  | {
    type: "subscription.canceled";
    provider: "stripe" | "paddle" | "lemonsqueezy" | "other";
    providerEventId: string;
    userId: string;
    customerId: string;
    subscriptionId: string;
    periodEnd: string;
  }
  | {
    type: "subscription.refunded";
    provider: "stripe" | "paddle" | "lemonsqueezy" | "other";
    providerEventId: string;
    userId: string;
    customerId: string;
    subscriptionId: string;
  };

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hmac(secret: string, input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return base64Url(new Uint8Array(sig));
}

async function verifyWebhookSignature(request: Request, rawBody: string, env: DenoEnv): Promise<boolean> {
  const secret = env.get("BILLING_WEBHOOK_SECRET") || "";
  const signature = request.headers.get("x-askaura-billing-signature") || "";
  const timestamp = request.headers.get("x-askaura-billing-timestamp") || "";
  if (!secret || !signature || !timestamp) return false;
  const ageMs = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
  return signature === await hmac(secret, `${timestamp}.${rawBody}`);
}

function isBillingEvent(input: unknown): input is BillingEvent {
  if (!input || typeof input !== "object") return false;
  const event = input as Record<string, unknown>;
  if (
    event.type !== "subscription.active" &&
    event.type !== "subscription.canceled" &&
    event.type !== "subscription.refunded"
  ) return false;
  if (
    event.provider !== "stripe" &&
    event.provider !== "paddle" &&
    event.provider !== "lemonsqueezy" &&
    event.provider !== "other"
  ) return false;
  return typeof event.providerEventId === "string" && event.providerEventId.length > 0 &&
    typeof event.userId === "string" && event.userId.length > 0 &&
    typeof event.customerId === "string" &&
    typeof event.subscriptionId === "string";
}

async function restFetch(env: DenoEnv, path: string, init: RequestInit = {}): Promise<Response> {
  const url = env.require("SUPABASE_URL").replace(/\/+$/, "");
  const serviceKey = env.require("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function hasProcessedEvent(env: DenoEnv, event: BillingEvent): Promise<boolean> {
  const params = new URLSearchParams({
    provider: `eq.${event.provider}`,
    provider_event_id: `eq.${event.providerEventId}`,
    select: "id,status",
    limit: "1",
  });
  const response = await restFetch(env, `/askaura_billing_events?${params}`);
  if (!response.ok) return false;
  const rows = await response.json().catch(() => []) as Array<{ id?: string; status?: string }>;
  return Boolean(rows[0]?.id && rows[0]?.status === "processed");
}

async function insertBillingEvent(env: DenoEnv, event: BillingEvent): Promise<void> {
  await restFetch(env, "/askaura_billing_events?on_conflict=provider,provider_event_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify([{
      provider: event.provider,
      provider_event_id: event.providerEventId,
      event_type: event.type,
      user_id: event.userId,
      provider_customer_id: event.customerId,
      provider_subscription_id: event.subscriptionId,
      status: "received",
      payload_summary: {
        hasPeriodEnd: "periodEnd" in event,
      },
    }]),
  });
}

async function markBillingEventProcessed(env: DenoEnv, event: BillingEvent): Promise<void> {
  const params = new URLSearchParams({
    provider: `eq.${event.provider}`,
    provider_event_id: `eq.${event.providerEventId}`,
  });
  await restFetch(env, `/askaura_billing_events?${params}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "processed",
      processed_at: new Date().toISOString(),
    }),
  });
}

async function updateEntitlement(env: DenoEnv, event: BillingEvent): Promise<void> {
  const active = event.type === "subscription.active";
  const canceled = event.type === "subscription.canceled";
  const refunded = event.type === "subscription.refunded";
  const body = {
    user_id: event.userId,
    plan: refunded ? "free" : "pro",
    status: active ? "active" : canceled ? "canceled" : "refunded",
    provider: event.provider,
    provider_customer_id: event.customerId,
    provider_subscription_id: event.subscriptionId,
    current_period_end: "periodEnd" in event ? event.periodEnd : null,
    cancel_at_period_end: canceled,
    metadata: {
      lastProviderEventId: event.providerEventId,
      lastBillingEventType: event.type,
    },
    updated_at: new Date().toISOString(),
  };
  const response = await restFetch(env, "/askaura_entitlements?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([body]),
  });
  if (!response.ok) throw new Error(await response.text());
}

Deno.serve(async (request: Request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const env = new DenoEnv();
  const rawBody = await request.text();
  if (!await verifyWebhookSignature(request, rawBody, env)) {
    return jsonResponse({ error: "Invalid signature" }, 400, CORS_HEADERS);
  }

  const parsed = JSON.parse(rawBody) as unknown;
  if (!isBillingEvent(parsed)) return jsonResponse({ error: "Invalid billing event" }, 400, CORS_HEADERS);
  const event = parsed;

  if (await hasProcessedEvent(env, event)) {
    return jsonResponse({ ok: true, idempotent: true });
  }

  await insertBillingEvent(env, event);
  if (await hasProcessedEvent(env, event)) {
    return jsonResponse({ ok: true, idempotent: true });
  }

  await updateEntitlement(env, event);
  await markBillingEventProcessed(env, event);
  return jsonResponse({ ok: true });
});
