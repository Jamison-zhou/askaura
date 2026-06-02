// "anchor" mode — 每日锚定（5 个维度）。
// 输出契约：[ANCHOR_CORE], [ANCHOR_COLOR], [ANCHOR_OBJECT], [ANCHOR_MOMENT], [ANCHOR_TAKEAWAY]

import type { AnchorRequest } from "../types.ts";

export function buildAnchorPrompt(req: AnchorRequest): string {
  return req.language === "zh"
    ? buildAnchorPromptZh(req)
    : buildAnchorPromptEn(req);
}

function buildAnchorPromptZh(req: AnchorRequest): string {
  const orientation = req.orientation === "reversed" ? "逆位" : "正位";
  return `【今日抽到】${req.cardName}（${orientation}）

请给出今日锚定，5 个维度。严格按格式：

[ANCHOR_CORE]
今日一句话，20 字以内。

[ANCHOR_COLOR]
今日色名，2-4 字（例：砚青、秋阳、墨黛、宣白）。不要解释，只给词。

[ANCHOR_OBJECT]
今日物，2-4 字（例：一杯热茶、一支笔、半本书）。不要解释，只给词。

[ANCHOR_MOMENT]
今日时刻提醒，15 字以内（例："午后的安静值得停下"）。

[ANCHOR_TAKEAWAY]
一句行动种子，25 字以内。`;
}

function buildAnchorPromptEn(req: AnchorRequest): string {
  const orientation = req.orientation === "reversed" ? "reversed" : "upright";
  return `[Today's card] ${req.cardName} (${orientation})

Give a daily anchor across 5 dimensions. Strictly:

[ANCHOR_CORE]
One sentence under 15 words.

[ANCHOR_COLOR]
A color name, 1-3 words (e.g., "ink slate", "evening amber"). Just the words, no gloss.

[ANCHOR_OBJECT]
A small object, 1-3 words (e.g., "a warm cup", "an unread book"). Just the words.

[ANCHOR_MOMENT]
A moment reminder, under 12 words (e.g., "the quiet after lunch is yours").

[ANCHOR_TAKEAWAY]
One action seed, under 20 words.`;
}
