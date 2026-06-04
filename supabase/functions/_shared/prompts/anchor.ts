// "anchor" mode prompt. Daily anchor output contract.
// Stable format is kept before dynamic card context for cache efficiency.
import type { AnchorRequest } from "../types.ts";

export function buildAnchorPrompt(req: AnchorRequest): string {
  return req.language === "zh"
    ? buildAnchorPromptZh(req)
    : buildAnchorPromptEn(req);
}

function buildAnchorPromptZh(req: AnchorRequest): string {
  const orientation = req.orientation === "reversed" ? "逆位" : "正位";
  return `任务：给出今日锚定，帮助用户只带走一件小事。

边界：
- 不预测未来，不下定论。
- 不解释牌义，不展开报告。
- 每个 token 内容要短，适合做今日复盘入口。

格式必须严格遵守：

[ANCHOR_CORE]
今日一句话，20 字以内。
[ANCHOR_COLOR]
今日色名，2-4 字。只给词，不解释。
[ANCHOR_OBJECT]
今日物，2-4 字。只给词，不解释。
[ANCHOR_MOMENT]
今日时刻提醒，25 字以内。
[ANCHOR_TAKEAWAY]
一句行动种子，25 字以内。

Dynamic context:
今日抽到：${req.cardName}（${orientation}）`;
}

function buildAnchorPromptEn(req: AnchorRequest): string {
  const orientation = req.orientation === "reversed" ? "reversed" : "upright";
  return `Task: Give a daily anchor that leaves the user with one small thing.

Boundaries:
- Do not predict the future or deliver verdicts.
- Do not explain card meanings or expand into a report.
- Keep each token compact enough for a daily review entry.

Strict format:

[ANCHOR_CORE]
One sentence under 15 words.

[ANCHOR_COLOR]
A color name, 1-3 words. Just the words, no gloss.

[ANCHOR_OBJECT]
A small object, 1-3 words. Just the words.

[ANCHOR_MOMENT]
A moment reminder, under 12 words.

[ANCHOR_TAKEAWAY]
One action seed, under 20 words.

Dynamic context:
Today's card: ${req.cardName} (${orientation})`;
}
