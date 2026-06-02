# Design

> 此镜（RiLL）的视觉系统。气质：**当代东方极简，夜墨底，现代仿宋骨，朱砂落款一点。**
> 所有设计决策从 PRODUCT.md 的 5 条原则推导。颜色用 OKLCH。

---

## 1. Visual Theme

**一句话场景**：深夜两点，独处一人，关掉大灯，台灯打开半盏。她坐在沙发上，端起手机，想问自己一件事。屏幕是夜墨色，像一池静水，灯光在边角晕开一点点暖。

气氛关键词：**安静、克制、留白、低光自省。**

**Theme**：深色为主（夜墨）。深色不是为了"神秘"或"塔罗仪式感"，是为了夜间低光环境下不刺眼，让人能久看、能慢思。

**Color strategy**：Restrained（克制）。

- 夜墨底占 80% 以上画面。
- 暖白 / 宣纸色为主排版色，占约 15%。
- 朱砂红只作 ≤ 5% 的"落款"型点睛，仅用于印章、当前选中卡牌、行动 CTA、关键状态指示。

---

## 2. Color Palette

所有颜色用 OKLCH 表示。绝不使用 `#000` / `#fff`。

### Base — 夜墨基底

| Token | OKLCH | 用途 |
|---|---|---|
| `--ink-night` | `oklch(0.15 0.012 240)` | 页面底色，深墨青，微偏冷 |
| `--ink-night-soft` | `oklch(0.18 0.012 240)` | 卡片背景 / 区块底（仅极少使用，多用线分组） |
| `--ink-night-lift` | `oklch(0.22 0.010 240)` | 浮层 / 弹窗（极少出现） |

### Paper — 暖白 / 宣纸色（前景文字 + 偶尔的素纸态）

| Token | OKLCH | 用途 |
|---|---|---|
| `--paper` | `oklch(0.94 0.015 75)` | 主正文 / 主标题，暖白略偏宣纸 |
| `--paper-soft` | `oklch(0.82 0.015 75)` | 副文 / 副标 |
| `--paper-dim` | `oklch(0.62 0.012 75)` | 注解 / placeholder / 元信息 |
| `--paper-mute` | `oklch(0.45 0.010 75)` | 禁用 / 极弱信息 |

### Accent — 朱砂（≤5% 落款型点睛）

| Token | OKLCH | 用途 |
|---|---|---|
| `--vermilion` | `oklch(0.52 0.16 28)` | 印章、行动 CTA、选中态、当前牌位 |
| `--vermilion-deep` | `oklch(0.42 0.15 28)` | 印章按压态 / 印章阴文 |
| `--vermilion-soft` | `oklch(0.65 0.12 28)` | 印章 hover / 行动 CTA hover |

### Line — 分割线（极重要，因为不用阴影分组）

| Token | OKLCH | 用途 |
|---|---|---|
| `--line` | `oklch(0.94 0.015 75 / 0.20)` | 显眼分组线（顶/底导航分隔） |
| `--line-soft` | `oklch(0.94 0.015 75 / 0.08)` | 卡片分组、行间细线 |
| `--line-ghost` | `oklch(0.94 0.015 75 / 0.04)` | 几乎不可见的网格辅助线 |

---

## 3. Typography

**类型策略**：中文为主，英文为副，两者共享同一种"东方排版逻辑"——字距宽、节奏疏、纵向呼吸足。

### Font stacks

```css
--font-display-cn: "Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", serif;
--font-display-en: "EB Garamond", "Cormorant Garamond", "Source Han Serif SC", serif;
--font-body-cn: "Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", serif;
--font-body-en: "EB Garamond", "Cormorant Garamond", "Source Han Serif SC", serif;
--font-stamp: "FZShuTi", "STKaiti", "Kaiti SC", "Songti SC", serif;  /* 楷书，仅用于印章/落款 */
```

> 现代仿宋（Source Han Serif SC SemiBold）作为主显示字体，理性不烫；不古董，不毛笔，不烟雾。

### Type scale

| Token | px | line-height | letter-spacing | 用途 |
|---|---|---|---|---|
| `--text-hero` | 96 | 1.05 | 0.20em | "此镜" 主标，超大号居中 |
| `--text-display-l` | 56 | 1.15 | 0.16em | 章节大标（如塔罗 / 梅花易数模式选择） |
| `--text-display-m` | 36 | 1.25 | 0.12em | 卡片标题、当前牌位名 |
| `--text-display-s` | 24 | 1.35 | 0.10em | 子标题 |
| `--text-body-l` | 20 | 1.85 | 0.04em | 主正文（哲学段、行动建议） |
| `--text-body-m` | 16 | 1.75 | 0.03em | 默认正文 |
| `--text-body-s` | 14 | 1.65 | 0.05em | 副文、注解 |
| `--text-caption` | 12 | 1.5 | 0.15em | 落款、meta、版权 |
| `--text-stamp` | 18 | 1 | 0 | 印章文字（楷书） |

### 中英混排规则

- 中英混排时英文按 0.92× 缩放视觉等高（中文笔画更密）。
- 标点前后空格：中文标点不空，中英之间空 1/4 全角。
- 数字（如"22 张大阿尔卡那"）采用拉丁字体的 oldstyle 数字。

### 关键 hierarchy 法则

- 标题与正文之间的字号比 ≥ 1.5；权重对比通过 SemiBold ↔ Regular。
- 字距是东方排版的灵魂：display 类一定要拉开（≥0.10em），body 适度（0.03–0.05em）。
- 单行字数：中文 ≤ 28 字 / 行，英文 ≤ 68ch / 行。

---

## 4. Layout & Spacing

### 节奏：中轴对称 + 大留白

- Hero 采用**中轴对称**：主标题（"此镜"）居中，下方副标、英文落款、流程入口依次纵列。
- 卡片选择类页面（intent-select / 牌阵）使用横向并列，但保留两侧大留白（≥ 12% viewport）。
- 段落之间用空白分组，**禁止使用 box-shadow 做卡片浮起**。卡片要分组就用 `--line-soft` 细线。

### Spacing scale

8-base，节奏偏稀疏：

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 24px
--space-6: 40px
--space-7: 64px
--space-8: 104px   /* 大区块呼吸，必须经常使用 */
--space-9: 168px   /* 章节间距 */
```

> 同一页面里至少要出现 3 种以上不同的 spacing token，禁止"所有 padding 都是 24px"的死板节奏。

### Container

- Hero / 流程页：宽度 1440px（保留现有视觉容器），不收紧。
- 文字密集页（行动收尾页 / 哲学页）：max-width 720px 居中。

---

## 5. Components

### Logo Lockup

- 主页中央：超大号"此镜"（96px，SemiBold，字距 0.20em）。
- 下方 24px 间距，小号 caption "RiLL — A mirror for clarity"（12px，0.15em，paper-dim 色）。
- 顶部细 ribbon SVG 保留，但颜色改为 paper-dim @ 0.4 alpha（不再是金色）。

### Card（塔罗 / 八卦卦象）

- 无背景填充。整张牌以**朱砂细边线**框定（1px，vermilion @ 0.5 alpha）。
- 卡牌图保留原 PNG，但叠加一层"灯光黄昏色" filter，弱化原西方塔罗的强烈黄绿，让它和夜墨底融洽。
- 当前选中：边线变实 vermilion，4 角出现极小（4px）朱砂方块。

### Button — 主行动（Enter / Begin / 提交）

- 无背景填充。文本居中。
- 上下细横线（line, 1px）夹住文本，左右无边线。
- Hover：横线变 vermilion；文本不变色。
- Active：文字下方出现极小朱砂方印（10×10px）"印"字（楷书）。

### Button — 次级（取消 / 跳过）

- 仅文本，下方 1px line-soft 横线。
- Hover：横线变 line。

### Input

- 无 border。仅底部 1px line-soft 横线。
- Focus：底部线变 paper。
- Placeholder 用 paper-dim，字号同 input 字号。

### 落款（Stamp）

- 朱砂方块，2-4 字楷书白色阴文反白。
- 用于：
  - 行动卡片右下角"愿"印
  - 完成页"读"印
  - 不用于：装饰性铺满页面（绝对禁止）

### Divider（横线 / 章节分割）

- 单条 1px 横线，width 取容器的 60-80%，居中，颜色 line-soft。
- 极少用纵线（除非分语言切换 "En / 中文"）。

### Navigation top bar

- 保留现有左语言切换 / 右 menu 结构。
- 字体从 Cormorant Garamond 切换为 EB Garamond + 中文用现代仿宋。
- "En / 中文" 中分隔用细斜杠 `/`，间距加宽到 0.4em。

---

## 6. Imagery

### 卡牌图（22 张大阿尔卡那）

- 不替换图源（保留资产）。
- 通过 CSS filter 统一基调：`filter: sepia(0.15) saturate(0.85) brightness(0.95) contrast(1.05)`；让它们看起来像被烛光照过。
- 卡牌阴影禁止使用（去掉所有 box-shadow），改用 vermilion 细边线。

### Hero 背景

- 现有 rill-water-bg.png 保留但**透明度降至 0.25**，叠加在夜墨底上。
- 顶部加一道极弱的"墨色渐隐"（从 ink-night 到 ink-night-soft，仅 1 % 强度），模拟卷轴自上而下展开的呼吸感。

### Ripple canvas

- 保留 canvas 但改为"墨点扩散"效果：起始点是一个 4-6px 的实心朱砂点，向外柔和扩散，扩散过程中失饱和度变为 paper-dim @ 0.1，duration 1200ms。
- 不再是水波纹的多圈同心。

### 装饰禁止清单

下列元素一律不出现在视觉系统里（违反"东方为骨，不是为衣"）：

- ❌ 龙凤、麒麟、瑞兽、神兽
- ❌ 云纹、回字纹、卷草纹、缠枝纹
- ❌ 灯笼、扇子、伞、屏风、毛笔
- ❌ 锦鲤、莲花、菊、梅枝（除"梅花易数"模块标题旁的微小标识外）
- ❌ 黄金色（任何金色）
- ❌ 渐变色背景
- ❌ 水墨 PS 滤镜素材

---

## 7. Motion

### 缓动函数

```
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
```

禁止使用 bounce / elastic / back。

### Durations

| Token | ms | 用途 |
|---|---|---|
| `--motion-fast` | 180 | hover / focus 反应 |
| `--motion-base` | 320 | 卡片入场、按钮状态切换 |
| `--motion-slow` | 600 | 页面转场、章节出现 |
| `--motion-veil` | 1200 | 墨点涟漪、入场氛围 |

### 章节转场

- 仅用透明度 + 轻量 translateY (≤ 12px) 组合。
- 禁止使用 transform: scale 做"突然变大"的强调。
- 禁止 CSS 布局属性的动画（width / height / top / left），全部走 transform。

### Reduced motion

- `prefers-reduced-motion: reduce` 时：
  - 所有 transform 动画关闭，仅保留透明度过渡。
  - Ripple canvas 完全不绘制。
  - 卡片入场改为 0ms 显示。

---

## 8. Iconography

- 几乎不用 icon。能用字就用字。
- 必要 icon（如语言切换、关闭、返回）：1.5px 描边，颜色 paper-dim，hover 改 paper。
- 禁止使用：emoji 风、彩色 icon、Material Icons 风格。

---

## 9. Brand ID 要点

- 主页中心：`此镜`（96px，居中，字距 0.20em，SemiBold）。
- 下方 24px：`RiLL — A mirror for clarity`（12px caption，paper-dim，letter-spacing 0.15em）。
- 现有 rill-logo-ribbon.svg 保留为装饰元素，但需重新着色为 paper-dim @ 0.4 alpha。
- "此镜" 楷书印章版本仅出现在加载页、完成页的右下角，作为落款。

---

## 10. 检查清单（落实时核对）

设计实施时，下列任一项不达标都视为偏离系统：

- [ ] 页面无任何金色（任何带 #FFD700 / #DAA520 / OKLCH chroma > 0.05 hue ≈ 90 的色都视为偏黄金）
- [ ] 页面无任何 box-shadow 用于"卡片悬浮"
- [ ] 页面无龙凤云纹灯笼等装饰元素
- [ ] 中文使用现代仿宋（Source Han Serif SC），不是黑体 / 圆体
- [ ] 字距 hierarchy 分明（display ≥ 0.10em，body ≤ 0.05em）
- [ ] 朱砂色仅出现在印章、行动 CTA、选中态——总占比 ≤ 5%
- [ ] 所有按钮无背景填充，仅靠横线 + 字
- [ ] Ripple 是墨点扩散，不是水波纹
- [ ] prefers-reduced-motion 完整支持
