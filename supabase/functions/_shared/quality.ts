import { DenoEnv } from "./llm.ts";
import type { ModelEntry, ModelTier, ReadingMode } from "./types.ts";

export type SafetyFlag =
  | "deterministic_future"
  | "fortune_change"
  | "reunion_probability"
  | "wealth_luck"
  | "medical_legal_financial_guarantee"
  | "overlong_output";

export type QualityEventInput = {
  userId: string;
  requestId?: string;
  promptVersion: string;
  mode: ReadingMode;
  entry: ModelEntry;
  tier: ModelTier;
  provider: string;
  model: string;
  thinking: string;
  tokenOk: boolean;
  missingTokens: string[];
  safetyFlags: SafetyFlag[];
  outputChars: number;
  latencyMs: number;
  status: "ok" | "warning" | "error";
};

const SAFETY_PATTERNS: Array<{ flag: SafetyFlag; pattern: RegExp }> = [
  { flag: "deterministic_future", pattern: /一定会|必然|注定|命中注定|guaranteed|will definitely|destined/i },
  { flag: "fortune_change", pattern: /改运|转运|change your luck|luck will change/i },
  { flag: "reunion_probability", pattern: /复合概率|reunion probability|chance of getting back together/i },
  { flag: "wealth_luck", pattern: /财富运|财运|wealth luck|money luck/i },
  { flag: "medical_legal_financial_guarantee", pattern: /诊断|治愈|诉讼必赢|投资一定|medical guarantee|legal guarantee|financial guarantee/i },
];

function baseUrl(env: DenoEnv): string {
  return (env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
}

export function scanContentSafety(text: string): SafetyFlag[] {
  const flags = new Set<SafetyFlag>();
  for (const item of SAFETY_PATTERNS) {
    if (item.pattern.test(text)) flags.add(item.flag);
  }
  if (text.length > 9000) flags.add("overlong_output");
  return [...flags];
}

export async function recordQualityEvent(env: DenoEnv, input: QualityEventInput): Promise<void> {
  const url = baseUrl(env);
  const serviceKey = env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return;

  await fetch(`${url}/rest/v1/askaura_quality_events`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([{
      user_id: input.userId || null,
      request_id: input.requestId || crypto.randomUUID(),
      prompt_version: input.promptVersion,
      mode: input.mode,
      entry: input.entry,
      tier: input.tier,
      provider: input.provider,
      model: input.model,
      thinking: input.thinking,
      token_ok: input.tokenOk,
      missing_tokens: input.missingTokens,
      safety_flags: input.safetyFlags,
      output_chars: input.outputChars,
      latency_ms: Math.max(0, Math.round(input.latencyMs)),
      status: input.status,
    }]),
  }).catch(() => undefined);
}
