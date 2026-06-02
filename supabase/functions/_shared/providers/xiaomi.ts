// Xiaomi MiMo provider (xiaomimo.com / token-plan).
//
// 服务方 base URL（专属域）：
//   https://token-plan-cn.xiaomimo.com/v1            # OpenAI 兼容
//   https://token-plan-cn.xiaomimo.com/anthropic     # Anthropic 兼容
//
// v1 选 OpenAI 兼容协议，与 KimiProvider 共用 OpenAICompatibleProvider。
// 鉴权头：Authorization: Bearer tp-xxxxxxxxxxxx
//
// Model ID 需要用户在控制台确认具体 MiMo 模型名（如 "xiaomi/MiMo-7B-RL" 等）。
// 通过 env XIAOMI_MODEL 配置，默认占位 "xiaomi-mimo" 需上线前替换。

import { OpenAICompatibleProvider } from "./openai-compatible.ts";
import type { Env } from "../llm.ts";

export class XiaomiProvider extends OpenAICompatibleProvider {
  constructor(env: Env, overrides: { model?: string; baseUrl?: string; apiKey?: string } = {}) {
    super({
      name: "xiaomi",
      endpoint: overrides.baseUrl || env.get("XIAOMI_BASE_URL") ||
        "https://token-plan-cn.xiaomimo.com/v1",
      apiKey: overrides.apiKey || env.require("XIAOMI_API_KEY"),
      model: overrides.model || env.get("XIAOMI_MODEL") || "xiaomi-mimo",
    });
  }
}
