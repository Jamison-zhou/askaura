# SSE 流式输出 — Design

> 日期：2026-05-12
> 目标：把 reading / advice / anchor 三个 LLM 调用从"非流式 30-40s 全部出"改为"SSE 流式 3-5s 首字 + 边读边生成"
> 实施：Sonnet 4.6 子 agent（参考[全局规则](~/.claude/templates/CLAUDE.md)第四节）

---

## 1. 现状基线

- reading mode TTFB ~38s（首字 = 全文出现）
- anchor mode TTFB ~23s
- 用户在抽牌后看 loading spinner 等满，体验反 ChatGPT/Claude 范式

根因：`stream: false` + MiMo 首字延迟本身 5-10s + 长输出 600 字 ≈ 30s 生成。

## 2. SSE 协议（前后端契约）

**Edge Function 响应：**
- Response header：`Content-Type: text/event-stream`
- 每个 chunk：`data: {"delta":"<片段文本>"}\n\n`
- 结束：`data: [DONE]\n\n` + close stream
- 错误：`data: {"error":"<信息>"}\n\n` + close stream
- 警告（token 校验失败但保留部分）：`data: {"warning":"missing tokens","fullText":"..."}\n\n`

**前端读取：**
- `fetch` 后用 `response.body.getReader()`
- `TextDecoder` 增量解码
- 按 `\n\n` 切 SSE event，提取 `data: ` 后的 JSON
- 累积 `fullText`，每次调 `onDelta(fullText)` 触发 UI 增量更新

## 3. LLMProvider 接口扩展

```ts
export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(messages, opts): Promise<string>;                       // 保留（兜底）
  chatStream(messages, opts): AsyncIterable<string>;           // 新增
}
```

`OpenAICompatibleProvider.chatStream`：
- POST 时加 `stream: true`
- 解析上游 SSE：`data: {"choices":[{"delta":{"content":"..."}}]}\n\n`
- yield 每个 delta.content 字符串
- 遇 `data: [DONE]` 结束 generator

`KimiProvider` / `XiaomiProvider` 继承自 OpenAICompatibleProvider，**自动获得 chatStream**，不需要改。

## 4. Edge Function reading/index.ts

```ts
return new Response(
  new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullText = "";
      try {
        for await (const chunk of provider.chatStream(messages, opts)) {
          fullText += chunk;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ delta: chunk })}\n\n`
          ));
        }
        // 流结束后做 token validation
        const missing = checkMissingTokens(fullText, requiredTokens);
        if (missing.length) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ warning: "missing_tokens", missing, fullText })}\n\n`
          ));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (e) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ error: String(e?.message ?? e) })}\n\n`
        ));
      } finally {
        controller.close();
      }
    },
  }),
  { headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" } }
);
```

注意：**v1 不做 retry on missing token**（流式 retry 复杂，且实测 MiMo 输出格式稳定）。缺 token 时前端展示已收到部分 + 警告，用户重抽即可。

## 5. 前端改造（index.html）

### 5.1 新增 `callReadingApiStream`

```js
async function callReadingApiStream(payload, onDelta) {
  if (!window.RILL_API?.isConfigured()) throw new Error("Supabase 配置未填");
  const response = await fetch(window.RILL_API.url("/reading"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": window.RILL_API.authHeader(),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || response.statusText || "API failed");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const dataLine = event.split("\n").find(l => l.startsWith("data: "));
      if (!dataLine) continue;
      const payload = dataLine.slice(6).trim();
      if (payload === "[DONE]") {
        if (!fullText.trim()) throw new Error("Empty model response");
        return fullText;
      }
      try {
        const json = JSON.parse(payload);
        if (json.error) throw new Error(json.error);
        if (json.delta) {
          fullText += json.delta;
          onDelta?.(fullText);
        }
        if (json.warning === "missing_tokens") {
          console.warn("RiLL: model output missing tokens:", json.missing);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return fullText;
}
```

### 5.2 改造 `runMainReadingApi` / `runAdviceApi` / `runDailyAnchorApi`

原 flow：
```js
const text = await callReadingApi(payload);
const parsed = parseMainReadingResponse(text);
renderReadingResult(parsed);
```

改为：
```js
const text = await callReadingApiStream(payload, (partialText) => {
  const parsed = parseMainReadingResponse(partialText);
  renderReadingResult(parsed);  // 增量 re-render，未完成的 token 自动被 parser 忽略
});
// 流结束后再 render 一次确认最终态
const final = parseMainReadingResponse(text);
renderReadingResult(final);
```

`parseMainReadingResponse` / `parseAdviceResponse` / `parseDailyAnchorResponse` **不需要改**——它们已经是 token-based，partial text 时未完整的 `[ANGLE2_TITLE]` 之后的内容会被自动归到 ANGLE2 但不影响已完整的 token 显示。

### 5.3 `callReadingApi` 保留

不删除原非流式 `callReadingApi`，作为降级 fallback（虽然 v1 不主动用）。

## 6. tarot-draw 不变

fire-and-forget 端点不需要流式。

## 7. 验收标准

| # | 项 | 标准 |
|---|---|---|
| 1 | curl reading endpoint | 看到多个 `data: {"delta":"..."}` chunk，间隔 100-500ms |
| 2 | 浏览器抽牌流程 | 抽牌后 3-5 秒内看到 [CORE] / 关键词出现 |
| 3 | 内容完整性 | 流结束后 keywords / core / hook / 3 angles / takeaway 全部正确显示 |
| 4 | 错误处理 | 网络中断 / 上游 error 时前端展示"出错请重试"，不白屏 |
| 5 | token 缺失（罕见） | 前端展示已收到部分，console.warn 记录 missing |

## 8. 风险

- **SSE 通过 supabase 边缘代理可能被 buffer**：Deno Edge Functions 支持 streaming，需在 Response 中明确不设 Content-Length（不要 buffer body）。代码中用 ReadableStream 即可。
- **MiMo SSE 上游格式**：理论上 OpenAI 兼容，但需 curl 实测。若格式特殊，OpenAICompatibleProvider.chatStream 需做适配。
- **前端增量 parse 重渲染抖动**：parseMainReadingResponse 每次 ~1ms，60fps 刷新无压力。但要确保 renderReadingResult 是幂等的（不会重复 append DOM）。
- **TLS 4s 首次握手**：流式无法缩短首次 TLS。后续请求会复用连接。

## 9. 工作量（≤6 项任务包）

1. `_shared/llm.ts` — LLMProvider 接口加 chatStream
2. `_shared/providers/openai-compatible.ts` — 实现 async *chatStream
3. `reading/index.ts` — 改 ReadableStream + SSE 输出
4. `index.html` — 加 callReadingApiStream
5. `index.html` — 改 runMainReadingApi / runAdviceApi / runDailyAnchorApi 三处使用流式
6. 部署 + curl smoke + 浏览器验证首字延迟

预估 2-3 小时。Sonnet 4.6 单 agent batch。

## 10. 不要做

- 不要改 anchor / advice 的 token 协议（保持兼容）
- 不要改 prompt 文件
- 不要破坏 reading.error / reading.inProgress 等 i18n
- 不要顺手加打字机动画 / 进度条等"增强"
- 不要 git commit（项目还没 git init）
