import type { AnyReadingRequest, ModelEntry, ModelTier } from "./types.ts";
import type { RuntimeConfig } from "./runtime-config.ts";

export type ModelRoute = {
  provider: "deepseek";
  model: "deepseek-v4-flash" | "deepseek-v4-pro";
  tier: ModelTier;
  entry: ModelEntry;
  thinking: { type: "disabled" } | { type: "enabled" };
  reasoningEffort?: "high" | "max";
  maxTokens: number;
};

type TierRuntimeConfig = {
  model?: string;
  maxTokens?: number;
  thinking?: boolean;
  reasoningEffort?: "high" | "max";
  enabled?: boolean;
};

const ENTRY_TOKEN_CAP: Record<ModelEntry, number> = {
  tarot: 1600,
  meihua: 900,
  dual: 2200,
  daily: 800,
  followup: 700,
  weekly: 1000,
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readTierConfig(config: RuntimeConfig, tier: ModelTier): TierRuntimeConfig {
  const models = config.models || {};
  const raw = models[tier] || {};
  return {
    model: raw.model,
    maxTokens: raw.maxTokens,
    thinking: raw.thinking,
    reasoningEffort: raw.reasoningEffort,
    enabled: raw.enabled,
  };
}

function normalizeEntry(req: AnyReadingRequest): ModelEntry {
  if (req.entry) return req.entry;
  if (req.mode === "anchor") return "daily";
  if (req.mode === "meihua-reading") return "meihua";
  if (req.mode === "dual-reading") return "dual";
  if (req.mode === "followup") return "followup";
  if (req.mode === "weekly-summary") return "weekly";
  if (req.mode === "advice" || req.mode === "clarify") return "followup";
  return "tarot";
}

function isProAllowed(config: RuntimeConfig): boolean {
  return config.models?.pro?.enabled === true && config.paid?.proModelEnabled === true;
}

function normalizeModel(tier: ModelTier): ModelRoute["model"] {
  return tier === "pro" ? "deepseek-v4-pro" : "deepseek-v4-flash";
}

export function resolveModelRoute(req: AnyReadingRequest, config: RuntimeConfig, requestedTier: ModelTier = "basic"): ModelRoute {
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
