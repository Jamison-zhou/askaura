# 响应式 / 移动端适配 — Design Brief

> 日期：2026-05-12
> 工作流：Opus 写 brief，Sonnet 4.6 子 agent 分批实施
> 用户已拍板（"按上面 4 件事 3-4h"）

---

## 1. Feature Summary

把此镜从"1440px 桌面专属 + 移动端 JS scale 兜底"扩展为**桌面 + 移动端双轨**真实响应式产品。Mobile 不是 desktop 的缩小版——是为单手深夜独处场景重新设计的并行体验。桌面 1440 体验**保持不变**。

## 2. Primary User Action

> 深夜独处，单手刷手机能完整走完"提问 → 抽牌 → 读卡 → 行动收尾"流程；每一步都不需要双手 / 缩放 / 长按。

## 3. Design Direction

继承 PRODUCT.md + DESIGN.md。响应式额外约定：

- Color / Typography / Spacing token **不变**——只随 breakpoint 调字号 px，OKLCH 色 / spacing scale 不动
- Scene sentence：*深夜两点，她单手刷手机，亮度调到最低。一只手撑头，一只手刷。中间穿插停顿、放下手机、再拿起。* → 强制"可中断恢复 / 单手友好"
- Anchor references：Stripe Atlas mobile flow、Apple Notes 编辑、Linear mobile（垂直滚动 + 大触摸区 + 极简装饰）

## 4. Scope

- **Fidelity**：Production-ready，直接改 styles.css + 必要时 index.html
- **Breadth**：全部页面（hero / mode-select / intent-select / intent-entry / pre-stage / reading / advice / takeaway / daily anchor / menu）
- **Time intent**：~3-4h，分 4 个 Sonnet agent 串行实施（共用一个 styles.css，不可并行）

## 5. Layout Strategy — Breakpoint 体系

| Breakpoint | 范围 | 策略 |
|---|---|---|
| **Mobile** | `< 768px` | 纵向 stack 重排、swipe 抽牌、大触摸区 |
| **Tablet** | `768-1279px` | 桌面布局 spacing/字号微调 |
| **Desktop** | `≥ 1280px` | 现有 1440 布局 + JS applyScale 保留不动 |

### Mobile 关键重排清单

#### 5.1 Hero
- `此镜` 字号 96px → 56px
- ribbon SVG opacity 进一步降至 0.15 或完全 hide（24 小时后 todo: 评估）
- caption `RiLL — A mirror for clarity` 12px → 11px
- philosophy 段 max-width auto → calc(100% - 32px)
- top: 220px → top: 96px

#### 5.2 Top nav
- top: 48px → top: 24px
- font-size 18px → 16px
- left/right padding: 72px → 24px

#### 5.3 mode-select / intent-select
- display: flex 横向 → 纵向 column
- gap: 190px → var(--space-6) (40px)
- mode-card / intent-card width: 199px → calc(90vw)
- intent-image: 240×384 → 180×288 (固定高宽比)

#### 5.4 intent-entry
- container width: 1440px → calc(100% - 32px)
- input 580px → calc(100% - 32px)
- title margin-top 170px → 80px

#### 5.5 pre-stage (核心创新)
- 22 张牌横向扇形 → **CSS scroll-snap horizontal carousel**
- 1 张大卡居中（72vw 宽），左右各露 25% 相邻牌
- 用户左右 swipe 切换，scroll-snap 锁定中央牌为选中
- 点击中央选中牌 = 确认抽取（保持现有 JS click handler 不变，只改 CSS）
- 桌面扇形布局 **完全保留**，仅在 `@media (max-width: 767px)` 下覆盖为 carousel

#### 5.6 reading-layout
- desktop: flex row（左卡 + 右文字）→ mobile: flex column（上卡 + 下文字）
- gap: 64px → var(--space-5)
- reading-card-image width 210px → 160px

#### 5.7 advice / takeaway
- max-width 720 自适应（已 OK）
- 字号缩小：advice 22px → 18px、takeaway-title 28px → 22px
- 按钮 touch target ≥ 44×44px

#### 5.8 daily anchor (postcard)
- postcard 内部 flex row → flex column
- card-image 自适应宽度

## 6. Key States

| 状态 | Mobile 处理 |
|---|---|
| Default | 同桌面，纵向布局 |
| Loading (SSE 流式) | 同桌面，文字增量 |
| Selected card | 朱砂边框保留，方块从 4×4 缩到 3×3 |
| Empty / Error | 同桌面，padding 加大保证可点 |
| Reduced-motion | 全部保留（继承 DESIGN.md §7） |
| Landscape (横屏) | **v1 不支持**——锁竖屏，避免抽牌 carousel 失败 |

## 7. Interaction Model

- **Touch target ≥ 44×44px**（iOS HIG），按钮 / 卡片 / input
- **Swipe carousel**：原生 CSS `scroll-snap-type: x mandatory` + `scroll-snap-align: center`，无自定义 JS 手势
- 触觉反馈 / 长按：v1 不做
- 键盘唤起：input focus 时 `scrollIntoView({behavior:"smooth", block:"center"})`
- 涟漪墨点 canvas：mobile 保留，pointerdown 触发

## 8. Content Requirements

不动 i18n 文案——所有 mobile 文案与桌面共用。

## 9. 实施分包（4 个 Sonnet agent，串行）

| Agent | 任务范围 | 工作量 |
|---|---|---|
| **A1** | 全局 breakpoint + Hero mobile (5.1) + Top nav mobile (5.2) + ribbon mobile | ~40 min |
| **A2** | mode-select (5.3) + intent-select (5.3) + intent-entry (5.4) + reflection 标题 | ~30 min |
| **A3** | pre-stage swipe carousel (5.5) — **核心创新，单独一个 agent** | ~60 min |
| **A4** | reading (5.6) + advice / takeaway (5.7) + daily (5.8) + menu mobile | ~50 min |

每个 agent 完成后 Opus `git diff` + Read 抽查再派下一个。

## 10. Open Questions (已用默认答案锁定)

| 问题 | 默认答案 |
|---|---|
| iOS Safari 100vh bug? | 用 `100dvh`，仅支持 iOS 16+ |
| PWA / manifest.json? | v1 不做 |
| 触觉反馈? | v1 不做 |
| 横屏支持? | v1 不支持，锁竖屏 |

## 11. 验收标准

- iPhone 13 Pro (390×844) Safari 走完整流程无横向滚动条
- 抽牌 swipe carousel 流畅，单手能选到任意一张
- 桌面 1440×1024 体验**零变化**（diff `@media (max-width: 1279px)` 之外的 CSS 应为零修改）
- DevTools toggle device emulation 切 iPhone/iPad 验证布局不破
