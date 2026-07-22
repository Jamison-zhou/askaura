# AskAura Handoff - 2026-06-02

## Project Location

- Local path: `D:\CursorAgentChats\askaura`
- This folder is now a standalone Git repository, not a `rill-clone` worktree.
- Upstream cijing repo remains separate at `D:\CursorAgentChats\rill-clone`.

## Git And Deployment

- GitHub repo: `https://github.com/Jamison-zhou/askaura`
- Vercel project: `askaura`
- Vercel production URL: `https://askaura.vercel.app`
- Last successful Vercel deployment ID: `dpl_9Zsi5Xbi4PMhUydwbxhiNnYBcsrL`
- Vercel project binding exists locally in `.vercel/project.json`; `.vercel` is ignored.

## Required Git Identity

Use this identity for GitHub commits:

```text
Jamison⚡CodeNinja <z1076250394@gmail.com>
```

Do not use:

```text
周剑辉⚡CodeNinja <17751764093@163.com>
```

Before committing, verify:

```powershell
git config user.name
git config user.email
git show -s --format="%an <%ae> / %cn <%ce>" HEAD
```

## Current Product State

AskAura is a static HTML/CSS/JS frontend with Supabase Edge Functions.

Primary files:

- `index.html`: main UI, flow logic, i18n, tarot ritual, result rendering.
- `styles.css`: visual system, ritual modal, result page styling.
- `assets/app/storage.js`: history record normalization.
- `assets/cards/backs/askaura-observation-gate-back.webp`: current card back used by the ritual deck. The earlier frosted-mirror asset has been retired.

The app has three entry modes:

- `牌象解读`
- `卦象解读`
- `双象报告`

## Latest UX Direction

Do not revert the current result page structure. The latest accepted direction is:

- Left side is a "本次象意摘要", not only a card image.
- Right side result structure:
  - 解读结果
  - 核心结论
  - 牌面告诉你
  - 你真正卡住的是
  - 这次结果提醒你
  - 下一步怎么做
  - 继续探索这次结果
- The top result section uses "这次结果提醒你"; the action board still uses "接下来观察什么".
- Follow-up panel separates ordinary questions from "抽一张澄清牌".
- Ordinary follow-ups append an answer on the same result page and must not redraw cards.
- Only "抽一张澄清牌" starts a new draw flow.
- The result bottom action "重新抽牌（新结果）" is intentionally visually weaker and asks for confirmation.

## Card Ritual State

The current ritual design uses:

- Larger full-screen ritual modal.
- 22-card spread.
- New frosted mirror card back image.
- Hover behavior is a restrained local lift, not face reveal.
- Selected card remains visibly raised above the spread, but not too high.

Known key CSS selector:

```css
.ritual-stage.is-previewing .ritual-card.is-chosen
```

The chosen-card lift was intentionally reduced to avoid hitting the title area.

## Verification Commands

Run these after changes:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

Local static server:

```powershell
python -m http.server 5173
```

Open:

```text
http://127.0.0.1:5173/index.html
```

## Deployment Commands

GitHub:

```powershell
git status --short --branch
git push origin main
```

Vercel:

```powershell
npx vercel deploy --prod --yes
```

If Vercel asks for device login, complete the browser authorization and rerun the deploy command if needed.

## Important Notes For Next Session

- Keep AskAura in `D:\CursorAgentChats\askaura`; do not continue it inside `rill-clone`.
- Keep GitHub commits under `Jamison⚡CodeNinja <z1076250394@gmail.com>`.
- Do not push any AskAura work to `Jamison-zhou/rill-cijing`.
- Do not reintroduce white input fields in the dark result/follow-up surfaces.
- Do not mix ordinary follow-up questions with clarification-card drawing.
- Do not show `undefined`, `null`, or empty result sections.
- Do not make "回到问题" submit the form.
