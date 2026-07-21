// Original reflection-card "reading" mode prompt.
// Stable instructions stay before dynamic context for provider input-cache friendliness.
import type { ReadingRequest, SpreadCard } from "../types.ts";

function compact(value: string, max = 240): string {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function delimitedValue(tag: string, value: string, max = 240): string {
  const safe = compact(value, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<${tag}>${safe}</${tag}>`;
}

function delimitedList(tag: string, values: string[] | undefined, maxItems = 3): string {
  const items = Array.isArray(values) ? values.slice(0, maxItems) : [];
  return `<${tag}>\n${items.map((value, index) => delimitedValue(`${tag}_ITEM_${index + 1}`, value)).join("\n")}\n</${tag}>`;
}

function formatCard(card: SpreadCard, index: number): string {
  return `<CARD_${index + 1}>
${delimitedValue("ID", card.id, 64)}
${delimitedValue("CATEGORY", card.category, 16)}
${delimitedValue("NAME", card.name, 80)}
${delimitedValue("LABEL", card.label, 80)}
${delimitedValue("POSITION", card.position, 16)}
${delimitedValue("CORE_MEANING", card.coreMeaning)}
${delimitedValue("VISIBLE_LINE", card.visibleLine)}
${delimitedValue("HIDDEN_LINE", card.hiddenLine)}
${delimitedList("REFLECTION_QUESTIONS", card.reflectionQuestions)}
${delimitedList("ACTION_SEEDS", card.actionSeeds)}
${delimitedList("PROHIBITED_CLAIMS", card.prohibitedClaims, 6)}
${delimitedValue("MEANING_VERSION", card.meaningVersion, 32)}
</CARD_${index + 1}>`;
}

function dynamicContext(req: ReadingRequest): string {
  const cards = (Array.isArray(req.cards) ? req.cards : []).slice(0, 3);
  return `Dynamic context:
<DYNAMIC_CONTEXT>
${delimitedValue("DECK_VERSION", req.deckVersion, 32)}
${delimitedValue("SPREAD_TYPE", req.spreadType, 32)}
${delimitedValue("MAIN_CARD", req.cardName, 80)}
${delimitedValue("INTENT", req.intent, 120)}
${delimitedValue("QUESTION", req.question, 1200)}
${delimitedValue("ROUND", String(req.round), 8)}
${delimitedValue("SESSION_HISTORY", req.sessionHistory, 2000)}
${cards.map(formatCard).join("\n")}
</DYNAMIC_CONTEXT>`;
}

export function buildReadingPrompt(req: ReadingRequest): string {
  const context = dynamicContext(req);

  if (req.language === "zh") {
    return `任务：基于原创反思牌，给出克制、具体、可验证的回应。

边界：
- 牌面语义只是用于反思的假设，不是关于用户、他人或现实的事实。
- 只连接用户已经表达的信息；不替用户或他人定性，不声称知道他人的内心、动机或未来。
- 不预测未来，不替用户做决定，不使用宿命化语言。
- 可以使用牌面提供的观察角度、反思问题和行动种子，但禁止重复或暗示牌面列出的禁止断言。
- 每一段都回应用户的具体问题，不能写成泛泛安慰。
- 不要把用户问题里的具体对象改写成另一个领域；问午餐就继续写午餐或饮食，问睡眠就继续写睡眠。
- 如果用户问的是吃饭、睡眠、工作、学习等具体日常问题，不要引入用户没有提到的人际关系、承诺、对方或表态。
- 如果用户问“今晚吃什么、午餐吃什么、点什么”这类轻量选择，直接给饮食选择框架，不要升级成情绪、关系或人生判断。
- 行动段必须尽量复用用户问题里的具体名词，并且是今天或本周能完成的具体动作。
- 全文保持简短。

只输出以下四段，不得增加其他 token、标题或前后文。
格式必须严格遵守，每个 token 单独一行：

[REFLECTION]
（这张牌照见了什么：只连接用户已经表达的事实，不超过 55 个中文字）

[HIDDEN]
（可能被忽略的部分：使用“可能、也许、值得观察”，不替用户或他人定性，不超过 55 个中文字）

[VERIFY]
（可以怎样验证：给出一个观察问题或小实验，不超过 45 个中文字）

[ACTION]
（今天能做的一步：具体、可执行、可在今天或本周完成，不超过 40 个中文字）

${context}`;
  }

  return `Task: Use the original reflection cards to give a restrained, concrete, testable response.

Boundaries:
- Card semantics are reflection hypotheses, not facts about the user, anyone else, or reality.
- Connect only to information the user expressed. You must not define the user or anyone else, claim hidden motives, or claim to know the future.
- Do not predict the future, decide for the user, or use fatalistic language.
- You may use the cards' observation angles, reflection questions, and action seeds, but never repeat or imply a prohibited claim.
- Every section must respond to the user's concrete question instead of offering generic comfort.
- Do not rewrite the user's concrete object into another domain. If they ask about lunch, keep writing about lunch or food; if they ask about sleep, keep writing about sleep.
- For concrete daily topics such as food, sleep, work, or study, do not introduce relationships, promises, another person, or demands for a response unless the user mentioned them.
- For light choices such as what to eat tonight, for lunch, or for takeout, give a practical food-choice frame without escalating it into emotion, relationships, or a life decision.
- The action section should reuse concrete nouns from the user's question where possible and must be achievable today or this week.
- Keep the whole answer compact.

Output exactly the four sections below, with no other tokens, headings, preface, or closing text.
Strict format. Put each token on its own line:

[REFLECTION]
(What the card reflects: connect only to facts already expressed by the user, under 180 characters)

[HIDDEN]
(What may be overlooked: use tentative language such as may, perhaps, or worth observing; do not define the user or anyone else, under 180 characters)

[VERIFY]
(How to verify it: give one observation question or small experiment, under 150 characters)

[ACTION]
(One step for today: concrete, executable, and achievable today or this week, under 120 characters)

${context}`;
}
