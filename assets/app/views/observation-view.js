import { recommendMode } from "../mode-recommender.js";

export function renderObservationRecommendation(elements, { question = "", translate }) {
  const recommendation = recommendMode(question);
  const labelKey = recommendation.mode === "meihua" ? "modeMeihua" : recommendation.mode === "dual" ? "modeDual" : "modeTarotResult";
  const reasonKey = recommendation.mode === "meihua"
    ? "modeRecommendationMeihua"
    : recommendation.mode === "dual"
    ? "modeRecommendationDual"
    : question.trim()
    ? "modeRecommendationTarot"
    : "modeRecommendationDefault";
  elements.container.dataset.recommendedMode = recommendation.mode;
  elements.name.textContent = translate(labelKey);
  elements.reason.textContent = translate(reasonKey);
  return recommendation;
}
