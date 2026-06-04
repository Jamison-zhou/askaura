// "meihua-reading" mode prompt.
// Keep the output contract stable; dynamic gua/question context is appended last.
import { findGuaByName } from "../data/meihua-gua.ts";
import type { MeihuaReadingRequest } from "../types.ts";

export function buildMeihuaPrompt(req: MeihuaReadingRequest): string {
  const gua = findGuaByName(req.guaName);
  if (!gua) throw new Error(`Unknown gua: ${req.guaName}`);

  if (req.language === "zh") {
    return `任务：基于梅花易数卦象，给出一个克制、具体、可执行的小行动。

边界：
- 不预测未来，不下定论，不替用户做决定。
- 不讲哲理，不展开卦理教材。
- 只给今天或这周可以做的一件具体行动。

格式必须严格遵守，只输出一个 token：

[ACTION]
（一句不超过 40 个中文字、可执行的行动）

Dynamic context:
卦：${gua.name}（${gua.image}，${gua.essence}）
意图：${req.intent}
问题：${req.question}`;
  }

  return `Task: Based on the Meihua Yishu gua, give one restrained, concrete action.

Boundaries:
- Do not predict the future, deliver verdicts, or decide for the user.
- Do not explain gua theory or philosophy.
- Give only one concrete action the user can do today or this week.

Strict format, one token only:

[ACTION]
(One concrete action under 45 chars)

Dynamic context:
Hexagram: ${gua.name} (${gua.image}, ${gua.essence})
Intent: ${req.intent}
Question: ${req.question}`;
}
