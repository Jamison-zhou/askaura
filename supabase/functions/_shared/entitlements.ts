import { DenoEnv } from "./llm.ts";
import type { ModelEntry, ModelTier } from "./types.ts";

export type EntitlementPlan = "free" | "trial" | "pro";
export type EntitlementStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled" | "refunded";

export type EntitlementSnapshot = {
  userId: string;
  plan: EntitlementPlan;
  status: EntitlementStatus;
  modelTier: ModelTier;
  canUsePro: boolean;
};

export type UsageEventInput = {
  userId: string;
  eventType: "reading" | "followup" | "weekly" | "export" | "share" | "portal";
  entry: ModelEntry | "";
  tier: ModelTier;
  model: string;
  maxTokens: number;
  status?: "ok" | "blocked" | "error";
  recordId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

function baseUrl(env: DenoEnv): string {
  return (env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
}

export async function fetchUserId(base: string, anonKey: string, authHeader: string | null): Promise<string> {
  if (!authHeader) return "";
  const response = await fetch(`${base.replace(/\/+$/, "")}/auth/v1/user`, {
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
  const url = baseUrl(env);
  const anonKey = env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const userId = url && anonKey ? await fetchUserId(url, anonKey, authHeader) : "";
  if (!userId || !serviceKey) {
    return { userId, plan: "free", status: "inactive", modelTier: "basic", canUsePro: false };
  }

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "plan,status,current_period_end",
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/askaura_entitlements?${params}`, {
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
  const periodActive = !row?.current_period_end || Date.parse(row.current_period_end) > Date.now();
  const active = periodActive &&
    ((row?.plan === "pro" && row?.status === "active") || (row?.plan === "trial" && row?.status === "trialing"));

  return {
    userId,
    plan: row?.plan || "free",
    status: row?.status || "inactive",
    modelTier: active ? "pro" : "basic",
    canUsePro: active,
  };
}

export async function recordUsageEvent(env: DenoEnv, input: UsageEventInput): Promise<void> {
  const url = baseUrl(env);
  const serviceKey = env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return;

  await fetch(`${url}/rest/v1/askaura_usage_events`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([{
      user_id: input.userId || null,
      event_type: input.eventType,
      entry: input.entry,
      tier: input.tier,
      model: input.model,
      max_tokens: input.maxTokens,
      status: input.status || "ok",
      record_id: input.recordId || "",
      request_id: input.requestId || crypto.randomUUID(),
      metadata: input.metadata || {},
    }]),
  }).catch(() => undefined);
}
