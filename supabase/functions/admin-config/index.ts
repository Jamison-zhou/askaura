// POST /functions/v1/admin-config
//
// action=login: 管理员账号密码登录，返回短期 token
// action=get:   读取运行配置（API Key 脱敏）
// action=save:  保存运行配置（需要 token）

import { CORS_HEADERS, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { DenoEnv } from "../_shared/llm.ts";
import { loadRuntimeConfig, publicRuntimeConfig, type RuntimeConfig } from "../_shared/runtime-config.ts";

const TOKEN_TTL_SECONDS = 60 * 60 * 6;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((item) => item.toString(16).padStart(2, "0")).join("");
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

async function signToken(secret: string, username: string): Promise<string> {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson({
    sub: username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
  const body = `${header}.${payload}`;
  return `${body}.${await hmac(secret, body)}`;
}

async function verifyToken(secret: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const body = `${parts[0]}.${parts[1]}`;
  if (await hmac(secret, body) !== parts[2]) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function cleanConfig(input: unknown): RuntimeConfig {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const llm = body.llm && typeof body.llm === "object" ? body.llm as Record<string, unknown> : {};
  const models = body.models && typeof body.models === "object" ? body.models as Record<string, unknown> : {};
  const paid = body.paid && typeof body.paid === "object" ? body.paid as Record<string, unknown> : {};
  const ops = body.ops && typeof body.ops === "object" ? body.ops as Record<string, unknown> : {};
  const translations = body.translations && typeof body.translations === "object"
    ? body.translations as Record<string, unknown>
    : {};
  const cleanModelTier = (value: unknown) => {
    const tier = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      model: typeof tier.model === "string" ? tier.model.trim() : undefined,
      maxTokens: typeof tier.maxTokens === "number" ? tier.maxTokens : undefined,
      thinking: typeof tier.thinking === "boolean" ? tier.thinking : undefined,
      reasoningEffort: tier.reasoningEffort === "high" || tier.reasoningEffort === "max" ? tier.reasoningEffort : undefined,
      enabled: typeof tier.enabled === "boolean" ? tier.enabled : undefined,
    };
  };
  const cleanLimit = (value: unknown, fallback: number, min: number, max: number) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
  };
  const cleanShortText = (value: unknown, maxLength: number) => {
    if (typeof value !== "string") return undefined;
    return value.trim().slice(0, maxLength);
  };
  return {
    llm: {
      provider: llm.provider === "kimi" || llm.provider === "xiaomi" || llm.provider === "deepseek" ? llm.provider : undefined,
      model: typeof llm.model === "string" ? llm.model.trim() : undefined,
      baseUrl: typeof llm.baseUrl === "string" ? llm.baseUrl.trim() : undefined,
      apiKey: typeof llm.apiKey === "string" && !llm.apiKey.includes("*") ? llm.apiKey.trim() : undefined,
      temperature: typeof llm.temperature === "number" ? llm.temperature : undefined,
      maxTokens: typeof llm.maxTokens === "number" ? llm.maxTokens : undefined,
    },
    models: {
      basic: cleanModelTier(models.basic),
      pro: cleanModelTier(models.pro),
    },
    paid: {
      enabled: typeof paid.enabled === "boolean" ? paid.enabled : undefined,
      proModelEnabled: typeof paid.proModelEnabled === "boolean" ? paid.proModelEnabled : undefined,
      freeDailyFollowups: cleanLimit(paid.freeDailyFollowups, 3, 0, 20),
      proDailyFollowups: cleanLimit(paid.proDailyFollowups, 20, 0, 100),
      freeMonthlyExports: cleanLimit(paid.freeMonthlyExports, 3, 0, 50),
      proMonthlyExports: cleanLimit(paid.proMonthlyExports, 50, 0, 500),
    },
    ops: {
      promptVersion: cleanShortText(ops.promptVersion, 80),
      qualityLoggingEnabled: typeof ops.qualityLoggingEnabled === "boolean" ? ops.qualityLoggingEnabled : undefined,
      contentSafetyScanEnabled: typeof ops.contentSafetyScanEnabled === "boolean" ? ops.contentSafetyScanEnabled : undefined,
      experimentKey: cleanShortText(ops.experimentKey, 80),
      rollbackNote: cleanShortText(ops.rollbackNote, 240),
    },
    translations,
  };
}

async function saveConfig(env: DenoEnv, nextConfig: RuntimeConfig): Promise<void> {
  const url = env.require("SUPABASE_URL").replace(/\/+$/, "");
  const serviceKey = env.require("SUPABASE_SERVICE_ROLE_KEY");
  const current = await loadRuntimeConfig(env);
  const apiKey = nextConfig.llm?.apiKey || current.llm?.apiKey || "";
  const config = {
    ...nextConfig,
    llm: {
      ...(nextConfig.llm || {}),
      apiKey,
    },
  };

  const resp = await fetch(`${url}/rest/v1/askaura_runtime_config?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([{
      id: "default",
      config,
      updated_at: new Date().toISOString(),
    }]),
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
}

Deno.serve(async (request: Request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const env = new DenoEnv();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") return jsonResponse({ error: "Invalid request" }, 400);

  if (body.action === "public") {
    const config = publicRuntimeConfig(await loadRuntimeConfig(env));
    delete config.llm?.apiKey;
    delete config.llm?.baseUrl;
    return jsonResponse({ config });
  }

  const adminUser = env.require("ADMIN_USERNAME");
  const passwordHash = env.require("ADMIN_PASSWORD_HASH");
  const sessionSecret = env.require("ADMIN_SESSION_SECRET");

  if (body.action === "login") {
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const candidateHash = await sha256Hex(`${username}:${password}`);
    if (username !== adminUser || candidateHash !== passwordHash) {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }
    return jsonResponse({ token: await signToken(sessionSecret, username), config: publicRuntimeConfig(await loadRuntimeConfig(env)) });
  }

  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!await verifyToken(sessionSecret, token)) return jsonResponse({ error: "Unauthorized" }, 401);

  if (body.action === "get") {
    return jsonResponse({ config: publicRuntimeConfig(await loadRuntimeConfig(env)) });
  }

  if (body.action === "save") {
    await saveConfig(env, cleanConfig(body.config));
    return jsonResponse({ ok: true, config: publicRuntimeConfig(await loadRuntimeConfig(env)) });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
});
