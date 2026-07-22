import {
  confirmAction,
  createTemporaryObservation,
  recordEcho,
  saveObservation,
} from "../observation-lifecycle.js";

export const RESULT_STEPS = ["summary", "insight-confirmed", "action-confirmed"];

export function createTemporaryResult(record, now = new Date()) {
  return createTemporaryObservation(record, now);
}

export function resultStep(record = {}) {
  if (record.lifecycleState === "active" || record.lifecycleState === "paused" || record.lifecycleState === "closed") {
    return "action-confirmed";
  }
  return record.selectedInsight ? "insight-confirmed" : "summary";
}

export function confirmResultInsight(record, insight, now = new Date()) {
  const selectedInsight = text(insight);
  if (!selectedInsight) throw new Error("insight_required");
  return {
    ...record,
    selectedInsight,
    updatedAt: now.toISOString(),
  };
}

export function confirmResultAction(record, values = {}, now = new Date()) {
  if (!text(record?.selectedInsight)) throw new Error("insight_required");
  const action = text(values.action || record.action);
  if (!action) throw new Error("action_required");
  const echoDueAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  return confirmAction(record, {
    action,
    actionTheme: text(values.actionTheme),
    echoDueAt,
  }, now);
}

export function saveResultObservation(record, now = new Date()) {
  return saveObservation(record, now);
}

export function updateJourneyState(record, action, now = new Date()) {
  const nextState = action === "pause" ? "paused" : action === "resume" ? "active" : action === "close" ? "closed" : record.lifecycleState;
  return { ...record, lifecycleState: nextState, updatedAt: now.toISOString() };
}

export function addJourneyEcho(record, status, note = "", now = new Date()) {
  const echoed = recordEcho(record, { status, note }, now);
  return status === "passed" ? { ...echoed, lifecycleState: "closed" } : echoed;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
