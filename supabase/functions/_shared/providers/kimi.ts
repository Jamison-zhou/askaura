// Kimi (Moonshot AI) provider.
// 官方文档：https://platform.moonshot.cn/docs/api/chat
// 协议：OpenAI Chat Completions 完全兼容。

import { OpenAICompatibleProvider } from "./openai-compatible.ts";
import type { Env } from "../llm.ts";

export class KimiProvider extends OpenAICompatibleProvider {
  constructor(env: Env, overrides: { model?: string; baseUrl?: string; apiKey?: string } = {}) {
    super({
      name: "kimi",
      endpoint: overrides.baseUrl || env.get("KIMI_BASE_URL") ||
        "https://api.moonshot.cn/v1/chat/completions",
      apiKey: overrides.apiKey || env.require("KIMI_API_KEY"),
      model: overrides.model || env.get("KIMI_MODEL") || "moonshot-v1-8k",
    });
  }
}
