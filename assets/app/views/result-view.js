import { resultStep } from "../controllers/journey-controller.js";

export function renderResultWorkflow(elements, record, { failed = false, language = "zh" } = {}) {
  const step = failed ? "failure" : resultStep(record);
  elements.resultWorkflow.dataset.resultStep = step;
  elements.resultWorkflow.hidden = false;
  elements.failureActions.hidden = !failed;
  elements.resultConfirmation.hidden = failed;
  elements.resultEvidenceText.textContent = record?.answer || "";
  elements.insightInput.value = record?.selectedInsight || record?.report?.summary || "";
  elements.actionInput.value = record?.action || record?.report?.actionText || "";
  elements.actionThemeInput.value = record?.actionTheme || "";
  elements.confirmInsight.disabled = failed || step !== "summary";
  elements.acceptAction.disabled = failed || step === "summary" || !elements.actionInput.value.trim();
  elements.editAction.disabled = failed || step === "action-confirmed";
  elements.saveObservation.disabled = failed || step === "action-confirmed";
  elements.leaveTemporary.disabled = failed || step !== "summary";
  elements.resultWorkflowStatus.textContent = statusText(step, language);
}

export function setSuccessfulResultActions(elements, enabled) {
  [
    elements.copy,
    elements.copySummary,
    elements.copyFull,
    elements.shareImage,
    elements.exportPdf,
    elements.createShareLink,
    elements.resonanceSubmit,
  ].filter(Boolean).forEach((button) => { button.disabled = !enabled; });
}

function statusText(step, language) {
  const zh = {
    summary: "先确认这次最重要的洞见，再决定是否把行动带进旅程。",
    "insight-confirmed": "洞见已确认。你可以接受或编辑这一步。",
    "action-confirmed": "这一步已进入旅程，三天后会回来问一句：后来怎么样了？",
    failure: "生成没有完成。你的问题和象仍在，可以选择下一步。",
  };
  const en = {
    summary: "Confirm the key insight before taking an action into your journey.",
    "insight-confirmed": "Insight confirmed. Accept or edit the next action.",
    "action-confirmed": "This action is now in your journey. AskAura will invite an echo in three days.",
    failure: "Generation did not finish. Your question and symbols are still here.",
  };
  return (language === "zh" ? zh : en)[step] || "";
}
