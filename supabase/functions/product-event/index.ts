import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { DenoEnv } from "../_shared/llm.ts";

const EVENTS = new Set(["observation_started", "observation_completed", "insight_confirmed", "action_confirmed", "echo_recorded", "journey_reopened", "temporary_expired", "flow_failed"]);
const MODES = new Set(["", "tarot", "meihua", "dual", "daily"]);
const STATES = new Set(["", "temporary", "saved", "active", "paused", "closed", "legacy"]);
const DURATIONS = new Set(["", "<3s", "3-10s", "10-30s", ">30s"]);
const ERROR_CODES = new Set(["", "generation_failed"]);

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function optionalUser(baseUrl: string, anonKey: string, authorization: string | null) {
  const bearer = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer || bearer === anonKey) return null;
  const response = await fetch(`${baseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` } });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return typeof user?.id === "string" ? user.id : null;
}

Deno.serve(async (request: Request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  try {
    const body = await request.json().catch(() => ({}));
    const eventName = text(body?.eventName, 48);
    const mode = text(body?.mode, 16);
    const lifecycleState = text(body?.lifecycleState, 24);
    const durationBucket = text(body?.durationBucket, 16);
    const errorCode = text(body?.errorCode, 48);
    if (!EVENTS.has(eventName) || !MODES.has(mode) || !STATES.has(lifecycleState) || !DURATIONS.has(durationBucket) || !ERROR_CODES.has(errorCode)) {
      return jsonResponse({ error: "invalid_event" }, 400);
    }

    const env = new DenoEnv();
    const baseUrl = env.require("SUPABASE_URL").replace(/\/+$/, "");
    const anonKey = env.require("SUPABASE_ANON_KEY");
    const serviceRoleKey = env.require("SUPABASE_SERVICE_ROLE_KEY");
    const userId = await optionalUser(baseUrl, anonKey, request.headers.get("Authorization"));
    const anonymousId = text(request.headers.get("x-askaura-anonymous-id"), 80);
    const response = await fetch(`${baseUrl}/rest/v1/askaura_product_events`, {
      method: "POST",
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify([{ user_id: userId, anonymous_id: anonymousId, event_name: eventName, mode, lifecycle_state: lifecycleState, duration_bucket: durationBucket, error_code: errorCode }]),
    });
    if (!response.ok) throw new Error(await response.text());
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "event_failed" }, 500);
  }
});
