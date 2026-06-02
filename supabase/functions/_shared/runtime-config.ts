import type { Env } from "./llm.ts";

export interface RuntimeConfig {
  llm?: {
    provider?: "kimi" | "xiaomi";
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  };
  translations?: Record<string, unknown>;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  llm: {
    provider: "xiaomi",
    model: "mimo-v2.5-pro",
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    temperature: 0.7,
    maxTokens: 2048,
  },
  translations: {},
};

export function mergeConfig(target: RuntimeConfig, source: RuntimeConfig): RuntimeConfig {
  const out = structuredClone(target);
  if (source.llm) out.llm = { ...(out.llm || {}), ...source.llm };
  if (source.translations) {
    out.translations = { ...(out.translations || {}), ...source.translations };
  }
  return out;
}

export async function loadRuntimeConfig(env: Env): Promise<RuntimeConfig> {
  const url = env.get("SUPABASE_URL");
  const serviceKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return DEFAULT_CONFIG;

  const resp = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rill_runtime_config?id=eq.default&select=config`, {
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
