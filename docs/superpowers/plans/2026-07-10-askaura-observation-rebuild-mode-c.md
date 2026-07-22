# AskAura 非对称观察室重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留 AskAura 数据、接口和核心交互契约的前提下，重新设计首页、结果信息架构和响应式布局。

**Architecture:** 保留静态 HTML/CSS/原生 JS 技术栈和现有元素 ID。首页 DOM 调整为“问题优先、模式随后、次级设置收拢”的非对称双栏；结果 DOM 调整为“主线与行动优先、依据随后、追问与复盘收尾”。主题样式继续使用独立 `theme-observation.css`，但不依赖旧布局位置。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js 断言测试、browser-harness。

## 全局约束

- 保留所有现有 ID、数据属性、事件监听入口和 Supabase 契约。
- 不新增产品功能，不修改支付、同步、存储和 Edge Functions。
- 不使用玄学化背景、紫色光效、月亮、环轨或金色古风装饰。
- 中文和英文现有文案继续由原 i18n 字典驱动。
- 390px 移动端无横向滚动，触摸控件不小于 44px。

---

### Task 1: 首页信息架构重排

**Files:**
- Modify: `index.html:105-184`
- Modify: `theme-observation.css`
- Modify: `tests/observation-theme-contract.test.mjs`

**Interfaces:**
- Consumes: `question-form`、`question-input`、`mode-card-grid`、`spread-selector`、`gua-cast-selector`、`cast-btn`。
- Produces: 保持相同 ID 的新首页 DOM 顺序和桌面非对称布局。

- [ ] 将问题输入框移到模式选择之前，让“写下问题”成为第一操作。
- [ ] 将示例问题与牌阵/起卦设置放入次级容器，保留现有按钮与事件委托。
- [ ] 用 CSS Grid 建立左侧品牌陈述、右侧提问工作区，780px 以下恢复单列。
- [ ] 增加结构契约并运行 `node tests/observation-theme-contract.test.mjs`。

### Task 2: 结果信息架构重排

**Files:**
- Modify: `index.html:212-327`
- Modify: `theme-observation.css`
- Modify: `tests/observation-theme-contract.test.mjs`

**Interfaces:**
- Consumes: `core-conclusion`、`action-board-title`、`action-board`、`tarot-reading-grid`、`report-stack`、`result-followup-section`。
- Produces: DOM 顺序为主线、行动、依据、复盘/追问，所有渲染 ID 保持不变。

- [ ] 将行动区移动到牌象/卦象依据之前。
- [ ] 桌面使用固定象征栏与阅读栏；移动端正文、行动、依据、象征物依次排列。
- [ ] 把保存、分享和重新生成保持为结果末尾次级操作。
- [ ] 运行结果与历史契约测试。

### Task 3: 导航、抽屉与后台精修

**Files:**
- Modify: `theme-observation.css`
- Modify: `tests/observation-theme-contract.test.mjs`

**Interfaces:**
- Consumes: `side-rail`、`rail-actions`、`mobile-rail-menu`、`utility-sheet`、`admin-shell`。
- Produces: 更清晰的主导航与统一辅助层，不更改按钮 ID。

- [ ] 把导航压缩为品牌、回看、同行、账号三个清晰层级。
- [ ] 保持历史、同行、登录为右侧抽屉，统一标题、筛选和列表密度。
- [ ] 后台继续保持工具型密度，不复制首页的展示型布局。
- [ ] 检查 focus-visible、hover、active、empty 和长文本状态。

### Task 4: 验证与验收

**Files:**
- Modify only when a verified defect requires a scoped fix.

**Interfaces:**
- Consumes: 完整页面和测试套件。
- Produces: 桌面与 390px 的真实验收证据。

- [ ] 使用 Node 24 运行 `tests/*.test.mjs`，要求零失败。
- [ ] 运行 `git diff --check`。
- [ ] 浏览器检查首页、三模式、仪式、历史记录、已有结果和后台。
- [ ] 使用 390×844 同源 iframe 检查 `scrollWidth === clientWidth`。

## 自检

- 首页、结果、导航、抽屉、后台和响应式均有明确任务。
- 结构调整不删除任何现有功能入口或脚本 ID。
- 重构只触及 HTML、主题 CSS、静态测试和已确认背景资产。

