# 此镜 (RiLL / cijing) — 项目规则

> 本文件每次会话开始时被 Codex 自动装载。
> 项目核心定位见 [PRODUCT.md](./PRODUCT.md) 与 [DESIGN.md](./DESIGN.md)。
> AI 接入架构见 [docs/specs/2026-05-11-ai-integration-design.md](./docs/specs/2026-05-11-ai-integration-design.md)。
> 全局通用规则见 `~/.Codex/templates/AGENTS.md`，本文件只放项目特有约定。

---

## 一、模型分工

继承全局规则：[`~/.Codex/templates/AGENTS.md` 第四节 "Subagent 协作"](../../../../Users/17751/.Codex/templates/AGENTS.md)。

**一句话：** Opus 主对话只做设计 / 规划 / 决策 / 多轮对话；动手实施一律派 Sonnet 4.6 子 agent，单 agent ≤ 6 项，三段式 prompt。< 3 步的单点操作 Opus 直接做。

本项目首次明确这条约定于 2026-05-12（cijing），随后升级为全局规则。

---

## 二、技术栈快照

- **前端**：纯静态 HTML + CSS（无构建步骤）
  - `index.html` 主入口（含所有 JS / i18n / 业务流程）
  - `styles.css` 视觉系统
  - 中国风视觉 token 已落地在 `styles.css` 顶部 `:root`（OKLCH 色板 + 现代仿宋字体栈 + spacing/motion）
- **后端**：Supabase Edge Functions（Deno runtime）
  - Project ref: `icvegpfnpkyrebtojoca`
  - Region: Northeast Asia (Tokyo)
  - 两个 endpoint：`reading` + `tarot-draw`
  - Provider 适配器层：`supabase/functions/_shared/providers/` (v1: Kimi + Xiaomi)
- **AI 模型**：通过 supabase secret `AI_PROVIDER` 切换
  - 当前 `AI_PROVIDER=xiaomi` + `XIAOMI_MODEL=mimo-v2.5-pro`
  - 端点 `https://token-plan-cn.xiaomimimo.com/v1`（小米官方 MiMo 生产 ALB 转发）

---

## 三、Edge Function 部署约定

- **永远走 supabase CLI 部署**（`supabase functions deploy <name> --project-ref icvegpfnpkyrebtojoca --no-verify-jwt`），不要试图 web 上传 zip。
- **修改 secret 不需要重新 deploy**（runtime 读取）。
- **修改 `.ts` 文件必须重新 deploy** 才生效。
- **`config.toml` 里 `verify_jwt = false`** 是有意的（v1 不做用户登录绑定）。改回 `true` 之前先实现 auth 流程，否则前端调用立刻 401。

---

## 四、视觉系统约束（来自 DESIGN.md，重要的复述一遍）

- **禁止金色**：任何 OKLCH chroma > 0.05 且 hue 接近 80-90 的色都视为"偏金"，违反规则。原 `#c9a96e` 已全替换为朱砂。
- **禁止 box-shadow 做卡片浮起**：唯一允许的 box-shadow 是 input autofill 重置 + menu vignette。
- **禁止龙凤云纹灯笼**等中国传统装饰元素。"东方为骨，不是为衣。"
- **中文用 Source Han Serif SC / Noto Serif SC（现代仿宋）**，不是黑体 / 圆体 / 楷书。楷书仅用于印章。
- **朱砂色 ≤ 5%**：仅印章 + 行动 CTA + 选中态 + 关键状态。

---

## 五、内容创作约束（来自 PRODUCT.md）

- 中文文案不要"亲爱的""宝贝"称呼，不要 emoji 表情。
- 禁止"算命 / 玄学 / 转运 / 灵签 / 改运 / 命中注定"等词汇。
- 行动建议必须**具体可执行**——不是"对自己好点"，是"为自己倒一杯温水"。
- 每次会话必须以一个**今天或这周可以做的具体行动**收尾。

---

## 六、敏感信息

- **小米 API key (`tp-xxx`) 已在聊天 transcript 暴露过**，联调完成后必须去 [token-plan-cn.xiaomimimo.com](https://token-plan-cn.xiaomimimo.com) 控制台 rotate。
- **任何时候不要把 service_role key 写进代码、git、聊天。** 只允许在 supabase secret 里。
- `index.html` 里的 `RILL_SUPABASE_ANON_KEY` 是 publishable key，公开可见无所谓。
