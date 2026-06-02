# 此镜 (RiLL) Supabase 后端

## 目录

```
supabase/
├── config.toml                         # 项目配置
├── README.md                           # 本文件
└── functions/
    ├── _shared/                        # 共享模块（types/cors/llm/prompts/validator）
    ├── reading/                        # POST /functions/v1/reading
    └── tarot-draw/                     # POST /functions/v1/tarot-draw
```

## 前置

- Supabase CLI ≥ 2.x（本地 `supabase --version` 应可用）
- 一个 Supabase project（项目里推荐叫 `rill` / `cijing`，Tokyo region）
- LLM API Key（v1 支持 Kimi / 小米；其他 provider 待补）

## 一次性初始化（约 10 分钟）

### 1. 登录 + link

```powershell
supabase login                            # 浏览器登录 supabase 账号
supabase link --project-ref <YOUR_REF>    # 在项目根目录运行
```

`<YOUR_REF>` 在 Supabase 控制台 → Project Settings → General → Reference ID 里看。

### 2. 设置 secrets（API Key 永不进代码 / git）

```powershell
supabase secrets set AI_PROVIDER=kimi

# Kimi（月之暗面）
supabase secrets set KIMI_API_KEY=sk-xxxxxxxxxxxx
supabase secrets set KIMI_MODEL=moonshot-v1-8k

# 小米 MiMo (xiaomimo.com / token-plan, OpenAI 兼容)
supabase secrets set XIAOMI_API_KEY=tp-xxxxxxxxxxxx
supabase secrets set XIAOMI_BASE_URL=https://token-plan-cn.xiaomimo.com/v1
supabase secrets set XIAOMI_MODEL=xiaomi-mimo   # 替换为控制台里具体的 model ID
```

查看已设的 secret（仅显示 key 名，不显示值）：

```powershell
supabase secrets list
```

### 3. 部署 functions

```powershell
supabase functions deploy reading
supabase functions deploy tarot-draw
```

部署成功后 endpoint：

```
POST https://<YOUR_REF>.supabase.co/functions/v1/reading
POST https://<YOUR_REF>.supabase.co/functions/v1/tarot-draw
```

调用需带 anon key 作 Authorization：

```
Authorization: Bearer <SUPABASE_ANON_KEY>
```

## 本机调试（可选，需要 Docker Desktop 启动）

```powershell
supabase start                              # 启动本地 stack（Postgres + Functions）
supabase functions serve reading --env-file .env.local
```

`.env.local` 文件示例（**不要提交到 git**）：

```
AI_PROVIDER=kimi
KIMI_API_KEY=sk-xxx
KIMI_MODEL=moonshot-v1-8k
```

curl 测试：

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/reading \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <LOCAL_ANON_KEY>" \
  -d '{
    "mode": "reading",
    "cardName": "The Star",
    "orientation": "upright",
    "intent": "Gain Clarity",
    "question": "我最近为什么总是失眠？",
    "round": 1,
    "sessionHistory": "",
    "language": "zh"
  }'
```

预期响应：

```json
{ "text": "[CORE]\n安静 · 修复 · 微光\n\n失眠不是问题，是身体在叫你停下。\n\n[HOOK]..." }
```

## 切换 AI provider

只改一个 env 变量，重新 deploy：

```powershell
supabase secrets set AI_PROVIDER=xiaomi
supabase functions deploy reading
```

支持的 provider（v1）：

| Provider | env 值 | 状态 |
|---|---|---|
| Kimi (Moonshot) | `kimi` | ✅ 已实现 |
| Xiaomi MiMo (token-plan, OpenAI 兼容) | `xiaomi` | ✅ 已实现 |
| DeepSeek | `deepseek` | 未实现（v1.5） |
| Qwen (阿里) | `qwen` | 未实现（v1.5） |
| GLM (智谱) | `glm` | 未实现（v1.5） |
| OpenAI | `openai` | 未实现（v1.5） |
| Anthropic | `anthropic` | 未实现（v1.5） |

## Token 输出协议

LLM 必须输出含特定 `[TOKEN]` 的纯文本。前端 parser 严格按此切片。

| Mode | 必需 token |
|---|---|
| `reading` | `[CORE]` `[HOOK]` `[ANGLE1_TITLE]` `[ANGLE1_BODY]` `[ANGLE2_TITLE]` `[ANGLE2_BODY]` `[ANGLE3_TITLE]` `[ANGLE3_BODY]` `[TAKEAWAY]` |
| `advice` | `[ADVICE_CORE]` `[ADVICE_BODY]` `[ADVICE_ACTION]` `[SESSION_END]` |
| `anchor` | `[ANCHOR_CORE]` `[ANCHOR_COLOR]` `[ANCHOR_OBJECT]` `[ANCHOR_MOMENT]` `[ANCHOR_TAKEAWAY]` |

后端会做一次校验 + 1 次 retry。两次都缺 → 返回 500，前端走 `showReadingApiError(true)` 路径。

## 故障排查

| 现象 | 排查 |
|---|---|
| 500 + `Missing required env: KIMI_API_KEY` | `supabase secrets list` 看是否设了，没设就 `supabase secrets set KIMI_API_KEY=xxx` |
| 500 + `[kimi] HTTP 401` | KIMI_API_KEY 错或过期 |
| 500 + `Model output missing required tokens after retry` | 模型不听话。看 logs：`supabase functions logs reading`。可能需要降 temperature 或换 prompt |
| 前端 CORS error | 检查 `_shared/cors.ts` 的 `Access-Control-Allow-Origin` 是否含你的来源域；本机调试用 `*` |

## 不要做

- ❌ 把 API key 写进任何 `.ts` / `.html` 文件
- ❌ 把 `.env.local` 提交到 git（已在 `.gitignore` 里）
- ❌ 直接给前端用户暴露 service role key（只用 anon key）
- ❌ 在 prompt 里拼接 user input 时跳过截断（前端有 200 字符限制，后端再保险一道）
