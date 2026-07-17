import type { Env } from "./llm.ts";

export interface RuntimeConfig {
  llm?: {
    provider?: "kimi" | "xiaomi" | "deepseek";
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  };
  models?: {
    basic?: {
      model?: string;
      maxTokens?: number;
      thinking?: boolean;
      reasoningEffort?: "high" | "max";
      enabled?: boolean;
    };
    pro?: {
      model?: string;
      maxTokens?: number;
      thinking?: boolean;
      reasoningEffort?: "high" | "max";
      enabled?: boolean;
    };
  };
  paid?: {
    enabled?: boolean;
    proModelEnabled?: boolean;
    freeDailyFollowups?: number;
    proDailyFollowups?: number;
    freeMonthlyExports?: number;
    proMonthlyExports?: number;
  };
  ops?: {
    promptVersion?: string;
    qualityLoggingEnabled?: boolean;
    contentSafetyScanEnabled?: boolean;
    experimentKey?: string;
    systemConvergenceV1Enabled?: boolean;
    rollbackNote?: string;
  };
  translations?: Record<string, unknown>;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  llm: {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    baseUrl: "https://api.deepseek.com/v1",
    temperature: 0.7,
    maxTokens: 2048,
  },
  models: {
    basic: {
      model: "deepseek-v4-flash",
      maxTokens: 1200,
      thinking: false,
      enabled: true,
    },
    pro: {
      model: "deepseek-v4-pro",
      maxTokens: 2200,
      thinking: true,
      reasoningEffort: "high",
      enabled: false,
    },
  },
  paid: {
    enabled: false,
    proModelEnabled: false,
    freeDailyFollowups: 3,
    proDailyFollowups: 20,
    freeMonthlyExports: 3,
    proMonthlyExports: 50,
  },
  ops: {
    promptVersion: "askaura-2026-06-03",
    qualityLoggingEnabled: true,
    contentSafetyScanEnabled: true,
    experimentKey: "",
    systemConvergenceV1Enabled: false,
    rollbackNote: "",
  },
  translations: {},
};

export function mergeConfig(target: RuntimeConfig, source: RuntimeConfig): RuntimeConfig {
  const out = structuredClone(target);
  if (source.llm) out.llm = { ...(out.llm || {}), ...source.llm };
  if (source.models) {
    out.models = {
      ...(out.models || {}),
      ...source.models,
      basic: { ...(out.models?.basic || {}), ...(source.models.basic || {}) },
      pro: { ...(out.models?.pro || {}), ...(source.models.pro || {}) },
    };
  }
  if (source.paid) out.paid = { ...(out.paid || {}), ...source.paid };
  if (source.ops) out.ops = { ...(out.ops || {}), ...source.ops };
  if (source.translations) {
    out.translations = { ...(out.translations || {}), ...source.translations };
  }
  return out;
}

export async function loadRuntimeConfig(env: Env): Promise<RuntimeConfig> {
  const url = env.get("SUPABASE_URL");
  const serviceKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return DEFAULT_CONFIG;

  const resp = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/askaura_runtime_config?id=eq.default&select=config`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!resp.ok) return DEFAULT_CONFIG;
  const rows = await resp.json().catch(() => []);
  const config = rows?.[0]?.config;
  if (!config || typeof config !== "object") return DEFAULT_CONFIG;
  return mergeConfig(DEFAULT_CONFIG, config as RuntimeConfig);
}

export function publicRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  const clone = structuredClone(config);
  if (clone.llm?.apiKey) clone.llm.apiKey = "********";
  return clone;
}
