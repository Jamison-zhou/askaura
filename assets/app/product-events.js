const EVENT_NAMES = new Set([
  "observation_started",
  "observation_completed",
  "insight_confirmed",
  "action_confirmed",
  "echo_recorded",
  "journey_reopened",
  "temporary_expired",
  "flow_failed",
]);
const MODES = new Set(["tarot", "meihua", "dual", "daily", ""]);
const LIFECYCLE_STATES = new Set(["temporary", "saved", "active", "paused", "closed", "legacy", ""]);
const ERROR_CODES = new Set(["", "generation_failed"]);
export const ANALYTICS_DISABLED_KEY = "askaura.analytics.disabled.v1";

export function sanitizeProductEvent(eventName, input = {}) {
  if (!EVENT_NAMES.has(eventName)) return null;
  return {
    eventName,
    mode: MODES.has(input.mode) ? input.mode : "",
    lifecycleState: LIFECYCLE_STATES.has(input.lifecycleState) ? input.lifecycleState : "",
    durationBucket: durationBucket(input.durationMs),
    errorCode: ERROR_CODES.has(input.errorCode) ? input.errorCode : "",
  };
}

export function createProductEventClient({ supabaseUrl, anonKey, fetchImpl = globalThis.fetch, storage = globalThis.localStorage } = {}) {
  async function emit(eventName, input = {}) {
    if (storage?.getItem?.(ANALYTICS_DISABLED_KEY) === "true") return { status: "disabled" };
    const event = sanitizeProductEvent(eventName, input);
    if (!event || !supabaseUrl || !anonKey || typeof fetchImpl !== "function") return { status: "skipped" };
    const response = await fetchImpl(`${String(supabaseUrl).replace(/\/+$/, "")}/functions/v1/product-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify(event),
    });
    return { status: response.ok ? "sent" : "failed" };
  }
  return { emit };
}

function durationBucket(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 3000) return "<3s";
  if (ms <= 10000) return "3-10s";
  if (ms <= 30000) return "10-30s";
  return ">30s";
}
