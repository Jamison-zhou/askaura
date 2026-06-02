// LLMProvider 接口 + factory。所有 provider 都实现 chat()。
// 切换 provider 只改 env AI_PROVIDER，不改代码。

import { KimiProvider } from "./providers/kimi.ts";
import { XiaomiProvider } from "./providers/xiaomi.ts";
// v1.5 补齐：deepseek / qwen / glm / openai / anthropic
// 添加新 provider 时：在 providers/ 下新建文件，import 进来，在 createProvider switch 加分支。

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  // 流式输出：每次 yield 一个文本增量（delta），调用方累积成完整文本。
  chatStream(messages: ChatMessage[], opts?: ChatOptions): AsyncIterable<string>;
}

export type ProviderName =
  | "kimi"
  | "xiaomi"
  | "deepseek"
  | "qwen"
  | "glm"
  | "openai"
  | "anthropic";

export interface ProviderOverrides {
  provider?: "kimi" | "xiaomi";
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

export function createProvider(env: Env, overrides: ProviderOverrides = {}): LLMProvider {
  const name = (overrides.provider || env.get("AI_PROVIDER") || "kimi").toLowerCase() as ProviderName;
  switch (name) {
    case "kimi":
      return new KimiProvider(env, overrides);
    case "xiaomi":
      return new XiaomiProvider(env, overrides);
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${name}". v1 supports: kimi, xiaomi.`,
      );
  }
}

// 抽象 env 访问（Deno.env in production, mock in tests）
export interface Env {
  get(key: string): string | undefined;
  require(key: string): string;
}

export class DenoEnv implements Env {
  get(key: string): string | undefined {
    return Deno.env.get(key);
  }
  require(key: string): string {
    const v = Deno.env.get(key);
    if (!v) throw new Error(`Missing required env: ${key}`);
    return v;
  }
}
