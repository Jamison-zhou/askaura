// POST /functions/v1/tarot-draw
//
// v1：埋点 fire-and-forget。仅做 schema 校验 + 控制台 log + 返回 200。
// 不落库（v1.5 接入 Postgres draw_events 表时再扩展）。
// 前端在 sendDrawEventToApi() 内 catch 失败，所以这里就算挂了也不影响主流程。

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import type { DrawEvent } from "../_shared/types.ts";

function isDrawEvent(b: unknown): b is DrawEvent {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  return typeof o.card === "string" &&
    (o.orientation === "upright" || o.orientation === "reversed") &&
    typeof o.intent === "string" &&
    typeof o.question === "string";
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

  if (!isDrawEvent(body)) {
    return jsonResponse({ error: "Invalid draw event shape" }, 400);
  }
  const ev = body;

  // v1: 仅 log，不落库。
  console.log(
    JSON.stringify({
      type: "draw",
      card: ev.card,
      orientation: ev.orientation,
      intent: ev.intent,
      questionLen: ev.question.length,
      ts: new Date().toISOString(),
    }),
  );

  return jsonResponse({ ok: true }, 200);
});
