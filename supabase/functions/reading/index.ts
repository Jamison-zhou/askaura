// POST /functions/v1/reading
//
// 入口：根据 body.mode 路由到三种 prompt 模板，调 provider 流式生成，
// 以 SSE（text/event-stream）推送给前端。
// 每个 chunk: data: {"delta":"..."}\n\n
// 结束:       data: [DONE]\n\n
// 警告（token 缺失）: data: {"warning":"missing_tokens","missing":[...],"fullText":"..."}\n\n
// 错误:       data: {"error":"..."}\n\n
//
// 前端契约见 _shared/types.ts 和 docs/specs/2026-05-12-streaming-sse-design.md。

import { CORS_HEADERS, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import {
  type ChatMessage,
  createProvider,
  DenoEnv,
} from "../_shared/llm.ts";
import type {
  AdviceRequest,
  AnchorRequest,
  AnyReadingRequest,
  ClarifyRequest,
  DualReadingRequest,
  FollowupRequest,
  MeihuaReadingRequest,
  ReadingMode,
  ReadingRequest,
  WeeklySummaryRequest,
} from "../_shared/types.ts";
import { getSystemPrompt } from "../_shared/prompts/style.ts";
import { buildReadingPrompt } from "../_shared/prompts/reading.ts";
import { buildAdvicePrompt } from "../_shared/prompts/advice.ts";
import { buildAnchorPrompt } from "../_shared/prompts/anchor.ts";
import { buildClarifyPrompt } from "../_shared/prompts/clarify.ts";
import { buildFollowupPrompt } from "../_shared/prompts/followup.ts";
import { buildWeeklySummaryPrompt } from "../_shared/prompts/weekly-summary.ts";
import { buildMeihuaPrompt } from "../_shared/prompts/meihua.ts";
import { buildDualPrompt } from "../_shared/prompts/dual.ts";
import { validateTokens } from "../_shared/token-validator.ts";
import { loadRuntimeConfig } from "../_shared/runtime-config.ts";
import { resolveModelRoute } from "../_shared/model-router.ts";
import { recordUsageEvent, resolveEntitlement } from "../_shared/entitlements.ts";
import { recordQualityEvent, scanContentSafety } from "../_shared/quality.ts";
import { routeQuestionSafety } from "../_shared/safety-router.ts";

function isReadingRequest(b: unknown): b is AnyReadingRequest {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  if (typeof o.mode !== "string") return false;
  if (!["reading", "advice", "anchor", "meihua-reading", "dual-reading", "clarify", "followup", "weekly-summary"].includes(o.mode)) return false;
  if (o.language !== "zh" && o.language !== "en") return false;
  if (o.mode === "weekly-summary") {
    return Array.isArray(o.records) && o.records.length >= 3;
  }
  if (o.mode === "clarify") {
    return typeof o.question === "string" && o.question.trim().length > 0;
  }
  if (o.mode === "followup") {
    return typeof o.originalQuestion === "string" && o.originalQuestion.trim().length > 0 &&
      typeof o.resultSummary === "string" && o.resultSummary.trim().length > 0 &&
      typeof o.followupQuestion === "string" && o.followupQuestion.trim().length > 0;
  }
  // meihua-reading uses guaName instead of cardName/orientation
  if (o.mode === "meihua-reading") {
    return typeof o.guaName === "string" && o.guaName.length > 0;
  }
  if (o.mode === "dual-reading") {
    return typeof o.question === "string" && o.question.trim().length > 0 &&
      typeof o.guaName === "string" && o.guaName.length > 0 &&
      Array.isArray(o.cards) && o.cards.length > 0;
  }
  if (typeof o.cardName !== "string" || !o.cardName) return false;
  if (o.orientation !== "upright" && o.orientation !== "reversed") return false;
  return true;
}

function buildUserPrompt(req: AnyReadingRequest): string {
  switch (req.mode) {
    case "reading":
      return buildReadingPrompt(req as ReadingRequest);
    case "advice":
      return buildAdvicePrompt(req as AdviceRequest);
    case "anchor":
      return buildAnchorPrompt(req as AnchorRequest);
    case "meihua-reading":
      return buildMeihuaPrompt(req as MeihuaReadingRequest);
    case "dual-reading":
      return buildDualPrompt(req as DualReadingRequest);
    case "clarify":
      return buildClarifyPrompt(req as ClarifyRequest);
    case "followup":
      return buildFollowupPrompt(req as FollowupRequest);
    case "weekly-summary":
      return buildWeeklySummaryPrompt(req as WeeklySummaryRequest);
  }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function getLlmOptions(req: AnyReadingRequest) {
  return {
    temperature: clampNumber(req.llm?.temperature, 0.7, 0, 1.5),
    maxTokens: Math.round(clampNumber(req.llm?.maxTokens, 2048, 128, 4096)),
  };
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!isReadingRequest(body)) {
    return jsonResponse(
      { error: "Invalid request shape (expected reading/advice/anchor/meihua-reading/dual-reading/clarify/followup/weekly-summary)" },
      400,
    );
  }
  const reqBody = body;

  const questionForSafety = reqBody.mode === "weekly-summary" || reqBody.mode === "anchor"
    ? ""
    : reqBody.mode === "followup"
    ? reqBody.followupQuestion
    : reqBody.question;
  const safetyRoute = routeQuestionSafety(questionForSafety);
  if (safetyRoute.route === "support") {
    return jsonResponse({ error: "immediate_support", reason: safetyRoute.reason }, 422);
  }
  if (safetyRoute.route === "professional-boundary") {
    return jsonResponse({ error: "professional_boundary", reason: safetyRoute.reason }, 422);
  }

  const env = new DenoEnv();
  const requestStartedAt = Date.now();
  const runtimeConfig = await loadRuntimeConfig(env);
  const runtimeLlm = runtimeConfig.llm || {};
  const opsConfig = runtimeConfig.ops || {};
  const entitlement = await resolveEntitlement(env, req.headers.get("Authorization"));
  const route = resolveModelRoute(reqBody, runtimeConfig, entitlement.modelTier);
  await recordUsageEvent(env, {
    userId: entitlement.userId,
    eventType: reqBody.mode === "followup" ? "followup" : reqBody.mode === "weekly-summary" ? "weekly" : "reading",
    entry: route.entry,
    tier: route.tier,
    model: route.model,
    maxTokens: route.maxTokens,
    metadata: {
      provider: route.provider,
      thinking: route.thinking.type,
      entitlementPlan: entitlement.plan,
      entitlementStatus: entitlement.status,
    },
  });
  const llmOptions = {
    ...getLlmOptions(reqBody),
    temperature: clampNumber(runtimeLlm.temperature ?? reqBody.llm?.temperature, 0.7, 0, 1.5),
    maxTokens: route.maxTokens,
    thinking: route.thinking,
    reasoningEffort: route.reasoningEffort,
  };
  let provider;
  try {
    provider = createProvider(env, {
      provider: route.provider,
      model: route.model,
      baseUrl: runtimeLlm.baseUrl,
      apiKey: runtimeLlm.apiKey,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: msg }, 500);
  }

  const systemPrompt = getSystemPrompt(reqBody.language);
  const userPrompt = buildUserPrompt(reqBody);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const mode: ReadingMode = reqBody.mode;

  const encoder = new TextEncoder();

  // SSE 流式响应
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const chunk of provider.chatStream(messages, llmOptions)) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`),
          );
        }

        // 流结束后做 token validation（v1 不重试，缺 token 发 warning event）
        const validation = validateTokens(fullText, mode);
        const safetyFlags = opsConfig.contentSafetyScanEnabled === false ? [] : scanContentSafety(fullText);
        if (opsConfig.qualityLoggingEnabled !== false) {
          await recordQualityEvent(env, {
            userId: entitlement.userId,
            promptVersion: opsConfig.promptVersion || "default",
            mode,
            entry: route.entry,
            tier: route.tier,
            provider: provider.name,
            model: provider.model,
            thinking: route.thinking.type,
            tokenOk: validation.ok,
            missingTokens: validation.missing,
            safetyFlags,
            outputChars: fullText.length,
            latencyMs: Date.now() - requestStartedAt,
            status: validation.ok && safetyFlags.length === 0 ? "ok" : "warning",
          });
        }
        if (!validation.ok) {
          console.warn(
            `[reading] missing tokens: ${validation.missing.join(", ")}`,
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ warning: "missing_tokens", missing: validation.missing, fullText })}\n\n`,
            ),
          );
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[reading] stream error:", msg);
        if (opsConfig.qualityLoggingEnabled !== false) {
          await recordQualityEvent(env, {
            userId: entitlement.userId,
            promptVersion: opsConfig.promptVersion || "default",
            mode,
            entry: route.entry,
            tier: route.tier,
            provider: provider.name,
            model: provider.model,
            thinking: route.thinking.type,
            tokenOk: false,
            missingTokens: [],
            safetyFlags: [],
            outputChars: fullText.length,
            latencyMs: Date.now() - requestStartedAt,
            status: "error",
          });
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-AskAura-Provider": provider.name,
      "X-AskAura-Model": provider.model,
      "X-AskAura-Tier": route.tier,
      "X-AskAura-Entry": route.entry,
      "X-AskAura-Thinking": route.thinking.type,
    },
  });
});
