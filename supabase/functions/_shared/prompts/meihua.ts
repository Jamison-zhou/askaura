// "meihua-reading" mode prompt — 梅花易数八卦解读。
// 输出契约（极简版）：仅 [ACTION] 一个 token + 一句可执行行动建议。

import { findGuaByName } from "../data/meihua-gua.ts";
import type { MeihuaReadingRequest } from "../types.ts";

export function buildMeihuaPrompt(req: MeihuaReadingRequest): string {
  const gua = findGuaByName(req.guaName);
  if (!gua) throw new Error(`Unknown gua: ${req.guaName}`);

  if (req.language === "zh") {
    return `得卦：${gua.name}（${gua.image}，${gua.essence}）
意图：${req.intent}
来问：${req.question}

请基于此卦象的"${gua.essence}"含义，给一句**今天或这周可以做的具体行动**。不解卦 / 不哲学 / 不预测。

格式（必须严格遵守，仅一个 token）：

[ACTION]
（一句 ≤30 中文字、可执行行动）`;
  }

  return `Hexagram: ${gua.name} (${gua.image}, ${gua.essence})
Intent: ${req.intent}
Question: ${req.question}

Based on this hexagram's "${gua.essence}" essence, give ONE concrete action user can do today or this week. No interpretation / no philosophy / no prediction.

Strict format (one token only):

[ACTION]
(One concrete action ≤ 45 chars)`;
}
