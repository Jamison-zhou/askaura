# 此镜（RiLL）AI 接入设计

> 日期：2026-05-11
> 作者：xujiajun + Claude
> 状态：**待拍板**（draft，未实施）

---

## 0. TL;DR

**现状**：前端已有完整的 AI 调用契约（`POST /api/reading`、`POST /api/tarot/draw`），但**后端不存在**，是纯静态 HTML 站。

**目标**：在不动前端业务逻辑的前提下，把这两个契约**用 Supabase Edge Functions** 实现，并支持**多 AI provider（DeepSeek / Qwen / GLM / Kimi / OpenAI / Anthropic）通过环境变量自由切换**。

**核心约束**：
- 不改前端业务流程（仅改 fetch URL 与 auth header）。
- API Key 永远不出现在前端。
- 切换 provider 只改环境变量，不改代码。
- 三个 mode（reading / advice / anchor）输出严格遵守现有 `[TOKEN]` 协议。

---

## 1. 前端现有契约（已扫描确认，不可变）

### 1.1 `POST /api/reading`

**Request body**：

```ts
type ReadingRequest =
  | { mode: "reading";
      cardName: string;
      orientation: "upright" | "reversed";
      intent: string;          // "Gain Clarity" / "Understand a Relationship" / "Ground Yourself"
      question: string;        // 用户当前问句
      round: number;           // 第几张牌（1-3）
      sessionHistory: string;  // 已抽过牌的上下文摘要
      language: "zh" | "en"; }
  | { mode: "advice";
      cardName: string;
      orientation: "upright" | "reversed";
      intent: string;
      question: string;
      sessionSummary: string;  // 整次会话所有牌的摘要
      language: "zh" | "en"; }
  | { mode: "anchor";
      cardName: string;
      orientation: "upright" | "reversed";
      language: "zh" | "en"; };
```

**Response**：`{ text: string }`，`text` 必须严格遵循下表 token 协议。

### 1.2 Token 协议（前端 parser 强约束）

| Mode | 必需 token | 可选 token | 说明 |
|---|---|---|---|
| **reading** | `[CORE]`、`[ANGLE1_TITLE]`/`[ANGLE1_BODY]`、`[ANGLE2_TITLE]`/`[ANGLE2_BODY]`、`[ANGLE3_TITLE]`/`[ANGLE3_BODY]`、`[TAKEAWAY]` | `[KEYWORDS]`、`[HOOK]` | `[CORE]` 第一行可以是 `X · Y · Z` 三个 anchor word（中文模板用 `·` 分隔），parser 会拆出来当 KEYWORDS |
| **advice** | `[ADVICE_CORE]`、`[ADVICE_BODY]`、`[ADVICE_ACTION]`、`[SESSION_END]` | — | `ADVICE_ACTION` 必须是一个**具体的行动建议**（PRODUCT 哲学：每次会话以行动收尾） |
| **anchor** | `[ANCHOR_CORE]`、`[ANCHOR_COLOR]`、`[ANCHOR_OBJECT]`、`[ANCHOR_MOMENT]`、`[ANCHOR_TAKEAWAY]` | — | 每日锚定，5 个维度 |

输出格式：每个 token 在单独一行，方括号后跟内容。`[]` 由 parser 剥掉，只保留内容。

### 1.3 `POST /api/tarot/draw`

**Request body**：
```ts
{ card: string; orientation: "upright" | "reversed"; intent: string; question: string }
```

**Response**：任意 200（前端 fire-and-forget，失败仅 console.warn）。
**用途**：埋点 / 日志 / 后续做"我的占卜记录"页面。

---

## 2. 架构

```
┌──────────────────────────────────────────────────────────────────────┐
│ Browser (前端)                                                        │
│   index.html → fetch(SUPABASE_URL + "/functions/v1/reading")         │
│       └─ Authorization: Bearer <SUPABASE_ANON_KEY>                    │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Supabase Edge Functions (Deno runtime)                               │
│                                                                       │
│  reading/index.ts                                                    │
│   ┌────────────────────────────────────────────────┐                │
│   │ 1. CORS preflight                              │                │
│   │ 2. parse body → ReadingRequest                 │                │
│   │ 3. route by mode → buildPrompt()               │                │
│   │ 4. provider = createProvider(env.AI_PROVIDER)  │                │
│   │ 5. text = await provider.chat(prompt, opts)    │                │
│   │ 6. validate tokens match required schema       │                │
│   │ 7. return { text }                             │                │
│   └────────────────────────────────────────────────┘                │
│                                  │                                    │
│                                  ▼                                    │
│  _shared/llm.ts (LLMProvider interface)                              │
│                                  │                                    │
│                                  ▼                                    │
│  _shared/providers/                                                  │
│   ├── deepseek.ts   ─→ api.deepseek.com/v1/chat/completions          │
│   ├── qwen.ts       ─→ dashscope.aliyuncs.com/...                    │
│   ├── glm.ts        ─→ open.bigmodel.cn/api/paas/v4/...              │
│   ├── kimi.ts       ─→ api.moonshot.cn/v1/chat/completions           │
│   ├── openai.ts     ─→ api.openai.com/v1/chat/completions            │
│   └── anthropic.ts  ─→ api.anthropic.com/v1/messages                 │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Supabase Postgres (可选 v1.5)                                         │
│   reading_logs / draw_events 表（埋点 + 后续历史记录功能）            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. 文件结构

```
rill-clone/
├── supabase/
│   ├── config.toml                              # supabase CLI config
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts                          # CORS helper
│       │   ├── llm.ts                           # LLMProvider 接口 + factory
│       │   ├── providers/
│       │   │   ├── deepseek.ts                  # v1 实现
│       │   │   ├── qwen.ts                      # v1 实现
│       │   │   ├── glm.ts                       # v1 实现
│       │   │   ├── kimi.ts                      # v1 实现
│       │   │   ├── openai.ts                    # v1 实现
│       │   │   └── anthropic.ts                 # v1 实现
│       │   ├── prompts/
│       │   │   ├── reading.ts                   # buildReadingPrompt(req)
│       │   │   ├── advice.ts                    # buildAdvicePrompt(req)
│       │   │   ├── anchor.ts                    # buildAnchorPrompt(req)
│       │   │   └── style.ts                     # 中国风产品哲学注入（system prompt）
│       │   ├── token-validator.ts               # 校验输出含必需 token
│       │   └── types.ts                         # ReadingRequest 等类型定义
│       ├── reading/
│       │   └── index.ts                         # /functions/v1/reading
│       └── tarot-draw/
│           └── index.ts                         # /functions/v1/tarot-draw
├── docs/
│   └── specs/
│       └── 2026-05-11-ai-integration-design.md  # 本文件
└── index.html  (改动: fetch URL + Authorization header)
```

---

## 4. LLMProvider 接口设计

### 4.1 接口定义（`_shared/llm.ts`）

```ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;     // 默认 0.7
  maxTokens?: number;       // 默认 2048
  topP?: number;            // 默认 0.9
  stop?: string[];          // 停止 token
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export function createProvider(env: Record<string, string>): LLMProvider {
  const name = (env.AI_PROVIDER || "deepseek").toLowerCase();
  switch (name) {
    case "deepseek":  return new DeepSeekProvider(env);
    case "qwen":      return new QwenProvider(env);
    case "glm":       return new GLMProvider(env);
    case "kimi":      return new KimiProvider(env);
    case "openai":    return new OpenAIProvider(env);
    case "anthropic": return new AnthropicProvider(env);
    default: throw new Error(`Unknown AI_PROVIDER: ${name}`);
  }
}
```

### 4.2 切换协议

- **运维侧切换**（默认）：改 Supabase secret `AI_PROVIDER` → 重新部署 function → 全站统一切换。
- 不暴露给前端用户。
- v2 可加 `X-AI-Provider` 请求头让前端选（需要白名单 + auth），现在不做。

### 4.3 各 provider 实现关键点

| Provider | Endpoint | Model 默认 | OpenAI 兼容? | 备注 |
|---|---|---|---|---|
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` | ✅ | 国内可访问，最便宜，中文好 |
| Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` | ✅（兼容模式） | 阿里，中文哲学权重高 |
| GLM | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | `glm-4-flash` | ✅ | 智谱，速度快 |
| Kimi | `https://api.moonshot.cn/v1/chat/completions` | `moonshot-v1-8k` | ✅ | 月之暗面，长上下文 |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` | ✅（原生） | 海外，需代理 |
| Anthropic | `https://api.anthropic.com/v1/messages` | `claude-haiku-4-5` | ❌（独立协议） | 海外，需代理，但质量稳 |

**实施策略**：

1. 写一个 `OpenAICompatibleProvider` 基类，包含 fetch + 协议解析。
2. DeepSeek / Qwen / GLM / Kimi / OpenAI 都继承它，只配 endpoint + apiKey + defaultModel。
3. Anthropic 独立类（用 `/v1/messages` 协议）。

这样 6 个 provider 真实代码量只有约 300 行。

---

## 5. Prompt 设计

### 5.1 System prompt（中国风产品哲学注入，所有 mode 共用）

中文版核心要点（提示词原文位于 `_shared/prompts/style.ts`）：

> 你是"此镜"——一面让人在不确定时刻看清自己的镜子。
> 你的语气：克制、安静、文学化，不要鸡汤体，不要"亲爱的"，不要 emoji。
> 你是工具，不是占卜师；不预测未来，不下定论，不替用户做决定。
> 你只提供几个看待当下的角度，让她自己读卡。
> 不使用"算命 / 玄学 / 转运 / 灵签 / 改运"等词汇。
> 输出格式：严格按 `[TOKEN]` 协议，每个 token 在独立一行，方括号后写内容。

英文版结构镜像，措辞参考现有 hero philosophy 段。

### 5.2 三个 mode 的 prompt 骨架

**reading**（每抽一张牌后调一次）：

```
[SYSTEM] {style}
[USER]
牌位：{cardName}（{orientation == "reversed" ? "逆位" : "正位"}）
意图：{intent}
来问：{question}
当前第 {round} 张牌。

{sessionHistory ? "之前的牌：" + sessionHistory : ""}

请用下列格式输出（严格遵守）：

[CORE]
（三个 anchor 词 · 中文 1-2 字一个） 然后空一行写一句 30 字以内的核心。

[HOOK]
一句 20 字以内的引子，引出下面三个角度。

[ANGLE1_TITLE] 角度一的小标题（4-6 字）
[ANGLE1_BODY] 60-100 字。从{intent}角度切入。

[ANGLE2_TITLE] 角度二的小标题
[ANGLE2_BODY] 60-100 字。

[ANGLE3_TITLE] 角度三的小标题
[ANGLE3_BODY] 60-100 字。

[TAKEAWAY]
一句 40 字以内的话，告诉她现在可以做什么。
```

**advice**（综合行动建议，最后一张牌后调）：

```
（system 同上）
[USER]
{intent} · {question}
本次会话 {N} 张牌：{sessionSummary}

请综合给出一段总结性建议，并给出一个具体的行动。

[ADVICE_CORE] 一句 30 字以内的话，提炼整次会话的核心。
[ADVICE_BODY] 120-180 字。结合 N 张牌的呼应给出综合视角。
[ADVICE_ACTION] 一个可以**今天**或**这周**做的具体动作（不超过 25 字，必须可执行）。
[SESSION_END] 一句送别，30 字以内。
```

**anchor**（每日锚定，未来在主页 demo）：

```
（system 同上）
[USER]
今日抽到：{cardName}（{orientation}）。

请给出今日锚定。

[ANCHOR_CORE] 今日一句话，20 字以内。
[ANCHOR_COLOR] 今日色，2-4 字（如"砚青"、"秋阳"）。
[ANCHOR_OBJECT] 今日物，2-4 字。
[ANCHOR_MOMENT] 今日时刻提醒，15 字以内。
[ANCHOR_TAKEAWAY] 一句行动种子，25 字以内。
```

### 5.3 Output 验证

`_shared/token-validator.ts` 在 provider 返回后跑一次：

- 检查所需 token 是否齐全（按 mode 表）。
- 如果缺 token：进入 1 次 retry，prompt 附加 "上一次输出缺了 [X][Y]，请按格式重写"。
- 仍缺：返回 `{ error: "Empty or malformed model response" }`，前端会展示错误页（已有 `showReadingApiError` 流程）。

---

## 6. 前端改动（最小侵入）

### 6.1 fetch URL 替换

`index.html` 内：

```js
// 改前
fetch("/api/reading", { method: "POST", ... })

// 改后
const SUPABASE_URL = window.RILL_SUPABASE_URL;     // 在 <script> 顶部注入
const SUPABASE_ANON_KEY = window.RILL_SUPABASE_ANON_KEY;
fetch(`${SUPABASE_URL}/functions/v1/reading`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: ...,
});
```

类似地改 `/api/tarot/draw` → `/functions/v1/tarot-draw`。

### 6.2 配置注入

在 `<head>` 顶部加：

```html
<script>
  window.RILL_SUPABASE_URL = "https://<your-project>.supabase.co";
  window.RILL_SUPABASE_ANON_KEY = "<anon_key>";   // anon key 暴露在前端是安全的，受 RLS 控制
</script>
```

> ⚠️ Anon key 暴露给前端是 Supabase 设计上允许的；保护 Edge Function 的方式是在函数内校验 JWT 或自定义 header。我们当前 v1 不做用户登录绑定，靠 **Edge Function 内部限流** + **anon key + CORS** 防滥用。

### 6.3 受影响代码点

按现有 grep 结果：

- `index.html:1564` — `fetch("/api/reading")` × 1
- `index.html:2078` — `fetch("/api/tarot/draw")` × 1
- `index.html:1414` — `const response = await fetch(url, ...)` 是 DECK_JSON 加载，不影响。

总改动 ≤ 20 行 JS。

---

## 7. Secret / 环境变量

Supabase Edge Functions 通过 `Deno.env.get()` 读取 secret。

```bash
# 配置（一次性）
supabase secrets set AI_PROVIDER=deepseek
supabase secrets set DEEPSEEK_API_KEY=sk-xxxxx
supabase secrets set DEEPSEEK_MODEL=deepseek-chat
supabase secrets set QWEN_API_KEY=sk-xxxxx           # 备用
supabase secrets set GLM_API_KEY=xxx                 # 备用
supabase secrets set KIMI_API_KEY=sk-xxxxx           # 备用
supabase secrets set OPENAI_API_KEY=sk-xxxxx         # 备用（如配代理需加 OPENAI_BASE_URL）
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx  # 备用
```

每个 provider 读取自己的 key + 可选的 BASE_URL 覆盖（方便走代理）。

切换 provider：

```bash
supabase secrets set AI_PROVIDER=qwen
supabase functions deploy reading
```

即可全站切换。

---

## 8. CORS / 限流 / 安全

### 8.1 CORS

`_shared/cors.ts`：

```ts
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",   // v1 全开，v2 收紧到生产域
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};
```

OPTIONS preflight 直接返回 204。

### 8.2 限流（v1 简版）

- Supabase Edge Functions 自带每函数 500 req/s 上限。
- 加上 anon key + CORS，挡掉一般爬虫。
- v1.5 加内存级 IP 限流：每 IP 每分钟 ≤ 20 次 reading 调用，超了返回 429。

### 8.3 abuse 风险评估

- **抢 key 跑 LLM**：anon key 暴露 → 别人可以无限调你的 function 烧你的 LLM 额度。v1 缓解：内存限流 + LLM 余额监控 + 后端 maxTokens 卡死 2048。v2：加用户登录绑定。
- **prompt injection**：用户 `question` 字段拼进 prompt。缓解：用户输入限长 200 字符（前端已有），system prompt 强约束输出格式，token validator 拒掉格式错误的响应。

---

## 9. 实施步骤 + 工作量预估

| Step | 内容 | 估时 | 依赖 |
|---|---|---|---|
| 1 | `supabase init` + `supabase functions new reading/tarot-draw` | 0.5h | 你本机装好 supabase CLI |
| 2 | 写 `_shared/llm.ts` + `OpenAICompatibleProvider` 基类 + DeepSeek 子类 | 1h | — |
| 3 | 写 `_shared/prompts/{reading,advice,anchor,style}.ts` 中英双语 | 2h | Round 1 跑通后会反复迭代 |
| 4 | 写 `reading/index.ts` 入口 + token-validator + 错误处理 | 1h | step 2-3 |
| 5 | 本机 `supabase functions serve reading` 跑通 DeepSeek 三个 mode | 1.5h | step 4 + 你给我 DeepSeek API key 测试 |
| 6 | 前端改 fetch URL + 注入 SUPABASE_URL/anon_key | 0.5h | step 5 |
| 7 | 真实部署 `supabase functions deploy` + 前端联调 | 0.5h | step 6 + 你给我 Supabase project URL/key |
| 8 | 写 Qwen / GLM / Kimi / OpenAI / Anthropic 5 个 provider | 1.5h | step 5 |
| 9 | `tarot-draw/index.ts`（埋点 → Postgres 表，可选 v1.5） | 1h | — |
| 10 | 文档：README 写部署说明 | 0.5h | — |
| **合计** | **v1 MVP（DeepSeek 单 provider 跑通）= step 1-7** | **~7h** | |
| | **v1 完整（6 provider 都能跑）= 全部** | **~10h** | |

---

## 10. 风险点

| 风险 | 概率 | 缓解 |
|---|---|---|
| Token 协议输出不稳定（模型不按格式来） | 中 | system prompt 强约束 + 1 次 retry + few-shot 示例 + 输出校验拒错 |
| 国内调海外 API 卡 / 慢 / 超时 | 高（如果选 OpenAI/Anthropic） | 默认 DeepSeek/Qwen 等国内 provider；海外 provider 走 OPENAI_BASE_URL 自定义代理 |
| Edge Function 冷启动慢（首次 1-2s） | 中 | Supabase 自动 warm-up 后稳定；前端展示"思考中..."掩盖 |
| API key 被前端拿到反向调用 | 已规避 | key 永远只在 Edge Function env 里，前端只有 anon key |
| Prompt 注入逃逸 | 低 | 用户输入限长 + 不允许 user message 直接出现在 [TOKEN] 协议外的位置 |
| 多 provider 输出风格差异大 | 中 | 用同一份 prompt + temperature 0.6-0.8 标准化；选定 DeepSeek 为 baseline，其他模型只是 fallback |

---

## 11. 待你拍板的开放问题

1. **Provider 优先级**：v1 MVP 是否就先做 DeepSeek 跑通，其他 5 个 provider 框架先留好但只填 DeepSeek？还是一次性 6 个全写完？
   - 默认建议：**先 DeepSeek 跑通端到端，其他 5 个作为 step 8 一次性补齐**（架构已留好接口，补一个 provider 实际只 30 行代码）。

2. **tarot-draw 埋点**：v1 是否需要落库（建 Postgres 表 `draw_events`）？还是先做空 200 OK，等"我的占卜记录"功能上时再做？
   - 默认建议：**v1 先做空 200 OK**（不浪费时间），落库放 v1.5。

3. **Supabase 项目**：你已有 supabase project 吗？还是我需要等你创建后再开始？
   - 这个我无法替你做（需要你创建 supabase 账号 + 项目，给我 project URL 和 anon key，并把 LLM provider 的 API key 设到 supabase secrets）。

4. **本机调试**：你本机装 supabase CLI 了吗？v1 step 1 需要 `supabase` 命令可用。如果没装，我可以先写代码 + 部署脚本，等你装好 CLI 我们一起跑 step 5。

5. **CSS 中国风改造并行**：你说"两条线并行"。我建议的并行策略：
   - **AI 这条线**：step 1-4（写代码）可以现在并行做（不需要等你给 key）。step 5 起需要你的 DeepSeek key 才能跑。
   - **中国风这条线**：CSS token + Hero 同时开干，因为它不依赖 AI。
   - 我先把 **AI step 1-4 + CSS Phase 1（token）** 一起做完，然后看哪条线先卡你。

---

请你拍板：

- 这个 design 整体接不接受？
- Open Question 5 项怎么回答？
