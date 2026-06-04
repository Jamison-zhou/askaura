// OpenAI Chat Completions 协议基类。
// Kimi / DeepSeek / Qwen-compat / GLM / OpenAI 都走这个协议，只配 endpoint + model + key。

import type { ChatMessage, ChatOptions, LLMProvider } from "../llm.ts";

export interface OpenAICompatibleConfig {
  name: string;
  endpoint: string;        // 可以是完整 URL（.../chat/completions）或 base URL（.../v1）
  apiKey: string;
  model: string;
  authHeader?: string;     // 默认 "Authorization"
  authPrefix?: string;     // 默认 "Bearer "
  extraHeaders?: Record<string, string>;
}

// base URL 自动补 /chat/completions；完整 URL 原样返回。
function resolveChatEndpoint(input: string): string {
  const trimmed = input.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private readonly cfg: OpenAICompatibleConfig;
  private readonly chatUrl: string;
  private readonly timeoutMs = 30_000;

  constructor(cfg: OpenAICompatibleConfig) {
    this.cfg = cfg;
    this.name = cfg.name;
    this.model = cfg.model;
    this.chatUrl = resolveChatEndpoint(cfg.endpoint);
  }

  // 构建请求头（chat 和 chatStream 共用）
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.cfg.extraHeaders || {}),
    };
    const authHeader = this.cfg.authHeader || "Authorization";
    const authPrefix = this.cfg.authPrefix ?? "Bearer ";
    headers[authHeader] = `${authPrefix}${this.cfg.apiKey}`;
    return headers;
  }

  private async fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`[${this.name}] Request timed out after ${Math.round(this.timeoutMs / 1000)}s`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const body = {
      model: this.cfg.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      top_p: opts.topP ?? 0.9,
      stream: false,
      ...(opts.stop ? { stop: opts.stop } : {}),
      ...(opts.thinking ? { thinking: opts.thinking } : {}),
      ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
    };

    const resp = await this.fetchWithTimeout(this.chatUrl, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(
        `[${this.name}] HTTP ${resp.status}: ${errText.slice(0, 500)}`,
      );
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      throw new Error(
        `[${this.name}] Empty or malformed response: ${
          JSON.stringify(data).slice(0, 500)
        }`,
      );
    }
    return text.trim();
  }

  // 流式输出：POST 加 stream:true，解析上游 SSE，yield 每个 delta.content。
  // 上游格式遵循 OpenAI 协议：data: {"choices":[{"delta":{"content":"..."}}]}\n\n
  async *chatStream(messages: ChatMessage[], opts: ChatOptions = {}): AsyncIterable<string> {
    const body = {
      model: this.cfg.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      top_p: opts.topP ?? 0.9,
      stream: true,
      ...(opts.stop ? { stop: opts.stop } : {}),
      ...(opts.thinking ? { thinking: opts.thinking } : {}),
      ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let resp: Response;
    try {
      resp = await fetch(this.chatUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`[${this.name}] Request timed out after ${Math.round(this.timeoutMs / 1000)}s`);
      }
      throw err;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      clearTimeout(timeout);
      throw new Error(
        `[${this.name}] HTTP ${resp.status}: ${errText.slice(0, 500)}`,
      );
    }

    if (!resp.body) {
      clearTimeout(timeout);
      throw new Error(`[${this.name}] Response body is null（stream 模式）`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按 \n\n 切分 SSE 事件块；最后一段不完整，保留在 buffer 等下次数据到来
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          // 从 event 中找以 "data: " 开头的行
          const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          const payload = dataLine.slice(6).trim();
          if (payload === "[DONE]") return; // 上游结束信号

          let parsed: { choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }> };
          try {
            parsed = JSON.parse(payload);
          } catch {
            // 非 JSON 行（注释、心跳等）跳过
            continue;
          }

          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta && typeof delta === "string") {
            yield delta;
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`[${this.name}] Request timed out after ${Math.round(this.timeoutMs / 1000)}s`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
      reader.cancel().catch(() => {});
    }
  }
}
