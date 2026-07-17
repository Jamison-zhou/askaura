import type { DualReadingRequest } from "../types.ts";

export function buildDualPrompt(req: DualReadingRequest): string {
  const cardContext = req.cards
    .map((card) => `${card.label || card.position || "card"}: ${card.name} (${card.orientation})`)
    .join("; ");

  if (req.language === "zh") {
    return `任务：把牌象提供的处境与情绪线索、卦象提供的趋势与节奏线索，整理成一次克制的双角度观察。

边界：
- 两个来源不代表更准确，也不形成确定结论。
- 不预测未来，不替用户做决定，不把象意写成注定的结果。
- 清楚区分牌象依据与卦象依据；冲突时如实说明，不强行统一。
- 结尾必须是一件今天或这周能做的小行动。

严格只输出以下六个标签：
[SUMMARY]
（2 至 3 句，说明当前最值得看见的共同主线）
[TAROT_EVIDENCE]
（牌象给出的处境、感受或关系线索）
[GUA_EVIDENCE]
（卦象给出的时机、趋势或节奏线索）
[AVOID]
（今天先不要做的一件事）
[WATCH]
（接下来观察的一个具体事实信号）
[ACTION]
（一件今天或这周可执行的小行动）

动态信息：
问题：${req.question}
意图：${req.intent}
牌象：${cardContext}
卦象：${req.guaName}`;
  }

  return `Task: combine the situational and emotional evidence from the cards with the timing and trend evidence from the gua into one restrained observation.

Boundaries:
- Two sources do not mean greater certainty.
- Do not predict the future, deliver a verdict, or decide for the user.
- Keep card and gua evidence distinct. If they differ, say so instead of forcing agreement.
- End with one small action for today or this week.

Output exactly these six tokens:
[SUMMARY]
(2-3 sentences on the shared thread worth noticing)
[TAROT_EVIDENCE]
(situational, emotional, or relational evidence from the cards)
[GUA_EVIDENCE]
(timing, trend, or pacing evidence from the gua)
[AVOID]
(one thing not to rush into today)
[WATCH]
(one concrete fact to watch next)
[ACTION]
(one small action for today or this week)

Dynamic context:
Question: ${req.question}
Intent: ${req.intent}
Cards: ${cardContext}
Gua: ${req.guaName}`;
}
