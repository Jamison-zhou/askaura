# 此镜 (RiLL / cijing)

> 一面用符号系统帮助自省的镜子。借助塔罗（22 张大阿尔卡那）与梅花易数（八卦），结合 AI，让人在不确定的时刻看得更清楚。不预测、不给定论、不替你做决定；只是提供几个看待当下的角度。每次会话以一个具体的行动收尾，因为生活终归是你自己来过。

---

## 项目文档

| 文件 | 内容 |
|---|---|
| [PRODUCT.md](./PRODUCT.md) | 产品定位、目标用户、品牌人格、反例参考、设计原则 |
| [DESIGN.md](./DESIGN.md) | 视觉系统：OKLCH 色板、字体栈、组件规范、印章规范 |
| [CLAUDE.md](./CLAUDE.md) | 协作规则与技术栈快照（模型分工、部署约定、视觉禁忌）|
| [docs/specs/2026-05-11-ai-integration-design.md](./docs/specs/2026-05-11-ai-integration-design.md) | AI 接入架构（Supabase Edge Functions + Provider 适配层）|
| [docs/specs/2026-05-12-streaming-sse-design.md](./docs/specs/2026-05-12-streaming-sse-design.md) | SSE 流式输出 design |

---

## 技术栈

- **前端**：纯静态 HTML + CSS（无构建步骤）
  - `index.html` — 主入口，含所有 JS / i18n / 业务流程
  - `styles.css` — 视觉系统（OKLCH token、东方极简组件）
- **后端**：Supabase Edge Functions（Deno runtime）
  - Project ref: `icvegpfnpkyrebtojoca`，Region: Northeast Asia (Tokyo)
  - 两个 endpoint：`reading`（塔罗解读）+ `tarot-draw`（抽牌）
  - Provider 适配器层：`supabase/functions/_shared/providers/`
- **AI 模型**：当前 `xiaomi` provider（MiMo-v2.5-pro），备用 `kimi`
  - 通过 supabase secret `AI_PROVIDER` 无重新部署切换
- **牌组数据**：22 张大阿尔卡那内嵌于 `index.html`，牌面图在 `assets/cards/`

---

## 本地开发

```bash
# 前端无构建步骤，直接启动静态 server
npx serve
# 或
python -m http.server 5173
```

打开 `http://localhost:5173` 即可。

**重要**：必须通过 HTTP server 访问（不能直接双击 `file://`），否则 ES module 与 Supabase Edge Function 请求会被浏览器拦截。

---

## 部署 Edge Functions

详见 [`supabase/README.md`](./supabase/README.md)。快速命令：

```bash
supabase functions deploy reading --project-ref icvegpfnpkyrebtojoca --no-verify-jwt
supabase functions deploy tarot-draw --project-ref icvegpfnpkyrebtojoca --no-verify-jwt
```

修改 `.ts` 文件后必须重新 deploy 才生效。修改 secret 无需重新 deploy。

---

## 切换 AI Provider

```bash
supabase secrets set --project-ref icvegpfnpkyrebtojoca AI_PROVIDER=kimi
# 或切回
supabase secrets set --project-ref icvegpfnpkyrebtojoca AI_PROVIDER=xiaomi
```

runtime 读取 secret，切换即时生效，不需要重新部署。

---

## 视觉与品牌约束

完整规范见 [DESIGN.md](./DESIGN.md)。关键禁忌：

- **不要金色**：朱砂（vermilion）代替一切金色；任何 OKLCH chroma > 0.05 且 hue ≈ 80-90 的色即视为违规
- **不要 box-shadow 做卡片浮起**：用 `--line-soft` 细边线分组
- **不要龙凤云纹灯笼**："东方为骨，不是为衣"
- **中文用现代仿宋**（Source Han Serif SC），不要黑体 / 圆体；楷书仅用于印章
- **朱砂色占比 ≤ 5%**：仅印章、行动 CTA、选中态、关键状态

---

## 内容创作约束

完整规范见 [PRODUCT.md](./PRODUCT.md)。关键禁忌：

- 不要"亲爱的"、"宝贝"、emoji 表情
- 不要"算命 / 玄学 / 转运 / 灵签 / 改运 / 命中注定"等词汇
- 行动建议必须具体可执行——不是"对自己好点"，是"为自己倒一杯温水"
- 每次会话以一个今天或这周可以做到的具体行动收尾

---

## 安全约定

- `service_role` key 永远不出现在代码 / git / 聊天记录中
- `RILL_SUPABASE_ANON_KEY`（`index.html` 内）是 publishable key，前端可见无妨
- LLM provider API key 仅存于 `supabase secrets`，不入代码仓库
- 项目历史聊天 transcript 曾暴露过小米 API key（`tp-xxx`），联调验证完成后请去 [token-plan-cn.xiaomimimo.com](https://token-plan-cn.xiaomimimo.com) 控制台 rotate
