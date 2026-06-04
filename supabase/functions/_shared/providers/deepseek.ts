import { OpenAICompatibleProvider } from "./openai-compatible.ts";
import type { Env } from "../llm.ts";

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(env: Env, overrides: { model?: string; baseUrl?: string; apiKey?: string } = {}) {
    super({
      name: "deepseek",
      endpoint: overrides.baseUrl || env.get("DEEPSEEK_BASE_URL") ||
        "https://api.deepseek.com/v1",
      apiKey: overrides.apiKey || env.require("DEEPSEEK_API_KEY"),
      model: overrides.model || env.get("DEEPSEEK_MODEL") || "deepseek-chat",
    });
  }
}
