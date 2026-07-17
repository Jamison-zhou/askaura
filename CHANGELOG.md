# Changelog

本项目变更记录。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## [Unreleased]

### Added — System Convergence V1 release candidate

- 自适应首页：新用户、临时观察、行动进行中、回声到期与返回用户使用不同入口。
- 问题优先的观察流程，保留牌象、卦象、双象三种方式；双象合并为一次生成请求。
- 结果确认工作流：确认洞见、确认行动、行动主题、回声与统一旅程页。
- 设置与数据中心：主题、语言、匿名统计开关、数据导出、本机/云端清理与账号删除边界。
- 匿名产品事件仅允许固定字段和固定错误码，不记录问题、答案、行动文本或回声内容。
- 共鸣池必须在行动和回声完成后才可提交。
- 精简运营台：模型路由只读，保留安全参数、质量与回滚开关。
- `index.html` 的应用逻辑已拆入 `assets/app/main.js` 和职责模块，后续功能不再继续堆入单文件。

### Changed

- 抽牌扇面从 22 个同时渲染节点降到 15 个可见节点，返回用户品牌等待上限缩短到 600ms。
- 卡背统一使用 observation-gate WebP 资产；新增控件完整适配深夜、浅色和单色主题。

### Verification

- Node 24.18.0 下 45 个本地测试全部通过。
- 浏览器完成 1920×900 与 390×844 的首页、问题入口、模式切换、设置、主题、旅程、回声和回滚验证，无横向溢出或控制台错误。
- 未运行真实账号、云端清理、账号删除或部署操作；缺少专用 smoke 凭据，因此默认 V1 开关仍保持关闭。

---

## [0.3.0] — 2026-05-12

### Added — A11y / Tablet / Reduced-motion 收尾（C1 + C2 并发）

#### `:focus-visible` 键盘可访问性
- 全局 `*:focus { outline: none }` 清默认 outline
- `*:focus-visible` 朱砂色 2px outline + 3px offset，**仅键盘 Tab 触发**（鼠标点击不出现）
- `.intent-entry-input:focus-visible` 用 border-bottom 指示（不与 outline 重叠）

#### Reduced-motion 加固
- 5 个 keyframes 全审查（intent-float / intent-underline-pulse / reading-pulse / chapter-underline-pulse / noteFadeIn）
- 显式 `animation: none !important` 补丁给所有含位移的 keyframes
- `noteFadeIn` `forwards` 动画在 reduced 下显式 `opacity: 1` 防永久不可见

#### Tablet 中间档（768–1279px）
- iPad 横屏（1024px）+ 13" 笔记本（1280 边界）双重覆盖
- Hero / Quote / Philosophy / Reflection 字号按 ~85% 比例缩
- mode-select gap 190→140，intent-select 130→100，intent-image 240→200
- reading 容器 width 用 `calc(100% - 80px)` 防 iPad 超宽

#### A11y (HTML 层)
- 36 个 `<img>` 全审查：3 个 intent 装饰图 + 22 张塔罗牌图加 `alt="" aria-hidden="true"`（旁边已有可见文字标识，避免 SR 冗余）
- 8 处 `aria-label` 新增：lang 切换按钮、双语子节点按钮（避免 SR 读两遍）、登出
- `note-letter` dialog 补 `aria-modal="true"`
- `<html lang>` 切换：JS 已正确同步（确认无需改动）
- Landmark 结构（`<main>` / `<nav>` / `<section>` / `<dialog>`）全完整

---

## [0.2.0] — 2026-05-12

### Added — 响应式 / 移动端适配（A1-A4，4 个 agent 协同）

- 三档断点：**Mobile** (<768px) / **Tablet** (768–1279) / **Desktop** (≥1280)
- Mobile：「此镜」96px → 56px，顶部导航 / Hero quote / philosophy 全部自适应
- Mobile：模式选择 / intent 选择 / intent-entry 横向 → **纵向 stack**
- Mobile 核心创新：22 张牌**横向扇形 → horizontal scroll-snap carousel**，中央牌 72vw 宽 + 左右露 14vw 邻牌，swipe 切换
- Mobile：reading 左卡+右文字 → **上卡+下文字**
- Mobile：印章 `.stamp` 44px → 36px，保留品牌落款
- Mobile：menu 弹层 → 全屏面板（top:0 / left:0 / width:100vw）
- **桌面 1440 体验零修改**（636 行新增 / 0 行删除）

### Added — 工程基础

- 首次 `git init` + baseline commit
- `.gitignore`：保护 `.env*` / `supabase/.temp` / `node_modules` / 编辑器临时文件
- `.gitattributes`：`* text=auto eol=lf` 防 Windows CRLF 反复伪修改

---

## [0.1.0] — 2026-05-12 (initial baseline)

### Added — 视觉系统（中国风改造 Phase 1-6）

- **色板（OKLCH）**：夜墨基底 + 暖白宣纸（≥15%）+ 朱砂落款（≤5%）
- **字体**：现代仿宋字体栈（Source Han Serif SC / Noto Serif SC），中文优先
- 88 处 `box-shadow` 清除，改用朱砂细边线分组（保留 input autofill 重置 + menu vignette）
- `enter-btn` 改为"**双横线夹文字**"东方版式
- `intent-card` 移除金色 radial-gradient 光晕（违反 DESIGN.md 禁 glow）
- 卡牌图烛光 sepia filter 让 22 张西方塔罗 PNG 与夜墨底融洽
- `ripple-canvas` 水波纹 → **墨点扩散**（朱砂 → paper-dim 渐变，1100ms `--motion-veil`）
- 印章组件 `.stamp` 朱砂方印 + 楷书反白「愿」/「读」落款
- `rill-logo-ribbon.svg` filter 去金（grayscale + brightness 调整）
- `hero-philosophy-more` 按钮东方化（去 uppercase / Satoshi，改次级按钮风）
- **88 处 Satoshi sans-serif 残留** → `var(--font-*)` token（Phase 4 收尾）

### Added — i18n 中文文案

- Intent：「看清 / 看关系 / 安定」（短句化）
- Mode subtext：「22 张大阿尔卡那 · 借符号自省」/「八卦 · 借象数自省」
- `hero.philosophy` 中文版克制化重写
- Proverb 标点东方化

### Added — AI 接入（Supabase Edge Functions）

- `LLMProvider` 接口 + `OpenAICompatibleProvider` 基类
- v1 实装 **Kimi** + **小米 MiMo**（MiMo-v2.5-pro）provider
- 三个 mode：`reading` / `advice` / `anchor` + token validator + 1 次 retry
- `supabase secret AI_PROVIDER` 切换即换模型，不改代码
- `[CORE]` / `[HOOK]` / `[ANGLE1_TITLE]` 等 token 协议（与原前端 parser 100% 兼容）

### Added — SSE 流式输出

- `LLMProvider.chatStream()` `AsyncIterable<string>`
- `reading` endpoint 改 `ReadableStream + text/event-stream`
- 前端 `callReadingApiStream` + 三个 reading flow 增量 render
- **首字延迟 ~30-40s → ~3-5s**（10× 感知改善）

### Added — 项目文档

- `PRODUCT.md` — 定位 / 用户 / 反例 / 5 条设计原则
- `DESIGN.md` — 视觉系统全量（色 / 字 / spacing / 印章 / 检查清单 10 节）
- `CLAUDE.md` — 项目规则 + 技术栈快照 + 部署约定
- `README.md` — 项目入口（本地开发 / 部署 / 切 provider）
- `supabase/README.md` — Edge Function 部署详解
- `docs/specs/2026-05-11-ai-integration-design.md`
- `docs/specs/2026-05-12-streaming-sse-design.md`
- `docs/specs/2026-05-12-responsive-design-brief.md`

### Fixed

- 补缺：`deepseek_json_20260312_f34a79.json`（22 张大阿尔卡那数据，原项目 .gitignore 漏 commit，导致抽牌无响应）
- ribbon SVG 内部 PNG 橙色透出违反禁金（CSS filter 去饱和）

### Infrastructure

- Supabase project `cijing` (region: Tokyo, ref: `icvegpfnpkyrebtojoca`) 创建
- 两个 Edge Function (`reading` / `tarot-draw`) 部署
- 6 个 secret 配置：`AI_PROVIDER` / `XIAOMI_API_KEY` / `XIAOMI_BASE_URL` / `XIAOMI_MODEL` / `KIMI_*`

### Notes

- **v1 明确不做**：PWA / 触觉反馈 / 横屏 / 我的占卜记录 / Postgres 落库
- **已知安全事项**：小米 token-plan key 在 transcript 暴露过，已 backlog 联调验证完成后 rotate
- **首次启用模型分工规则**：「Opus 主对话做设计 / Sonnet 子 agent 干实施」于本项目首次明确，同日升级为 `~/.claude/templates/CLAUDE.md` 第四节 "0. 分工硬约束"
- **8 次完整 agent 协同**（CSS Phase 1-6 / 印章 / Satoshi 清零 / SSE / 响应式 A1-A4），单 agent ≤6 项任务，每波 Opus `git diff` 抽查，0 越界 0 错误
