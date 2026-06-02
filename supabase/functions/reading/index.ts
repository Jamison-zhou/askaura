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
  MeihuaReadingRequest,
  ReadingMode,
  ReadingRequest,
} from "../_shared/types.ts";
import { getSystemPrompt } from "../_shared/prompts/style.ts";
import { buildReadingPrompt } from "../_shared/prompts/reading.ts";
import { buildAdvicePrompt } from "../_shared/prompts/advice.ts";
import { buildAnchorPrompt } from "../_shared/prompts/anchor.ts";
import { buildClarifyPrompt } from "../_shared/prompts/clarify.ts";
import { buildMeihuaPrompt } from "../_shared/prompts/meihua.ts";
import { validateTokens } from "../_shared/token-validator.ts";
import { loadRuntimeConfig } from "../_shared/runtime-config.ts";

function isReadingRequest(b: unknown): b is AnyReadingRequest {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  if (typeof o.mode !== "string") return false;
  if (!["reading", "advice", "anchor", "meihua-reading", "clarify"].includes(o.mode)) return false;
  if (o.language !== "zh" && o.language !== "en") return false;
  if (o.mode === "clarify") {
    return typeof o.question === "string" && o.question.trim().length > 0;
  }
  // meihua-reading uses guaName instead of cardName/orientation
  if (o.mode === "meihua-reading") {
    return typeof o.guaName === "string" && o.guaName.length > 0;
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
    case "clarify":
      return buildClarifyPrompt(req as ClarifyRequest);
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
      { error: "Invalid request shape (expected reading/advice/anchor)" },
      400,
    );
  }
  const reqBody = body;

  const env = new DenoEnv();
  const runtimeConfig = await loadRuntimeConfig(env);
  const runtimeLlm = runtimeConfig.llm || {};
  const llmOptions = {
    ...getLlmOptions(reqBody),
    temperature: clampNumber(runtimeLlm.temperature ?? reqBody.llm?.temperature, 0.7, 0, 1.5),
    maxTokens: Math.round(clampNumber(runtimeLlm.maxTokens ?? reqBody.llm?.maxTokens, 2048, 128, 4096)),
  };
  let provider;
  try {
    provider = createProvider(env, {
      provider: runtimeLlm.provider || reqBody.llm?.provider,
      model: runtimeLlm.model || (typeof reqBody.llm?.model === "string" ? reqBody.llm.model : undefined),
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
      "X-Rill-Provider": provider.name,
      "X-Rill-Model": provider.model,
    },
  });
});
