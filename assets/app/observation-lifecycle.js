const STATES = new Set(["temporary", "saved", "active", "paused", "closed", "legacy"]);
const ECHO_STATUSES = new Set(["", "changed", "unchanged", "not_done", "passed"]);
const TEMPORARY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeLifecycle(record = {}) {
  return {
    ...record,
    lifecycleState: STATES.has(record.lifecycleState) ? record.lifecycleState : "legacy",
    selectedInsight: text(record.selectedInsight),
    actionTheme: text(record.actionTheme),
    echoDueAt: text(record.echoDueAt),
    echoStatus: ECHO_STATUSES.has(record.echoStatus) ? record.echoStatus : "",
    echoNote: text(record.echoNote),
    temporaryExpiresAt: text(record.temporaryExpiresAt),
    sourceVersion: text(record.sourceVersion) || "legacy",
  };
}

export function createTemporaryObservation(record, now = new Date()) {
  return normalizeLifecycle({
    ...record,
    lifecycleState: "temporary",
    temporaryExpiresAt: new Date(now.getTime() + TEMPORARY_LIFETIME_MS).toISOString(),
    sourceVersion: "system-convergence-v1",
    updatedAt: now.toISOString(),
  });
}

export function saveObservation(record, now = new Date()) {
  return normalizeLifecycle({
    ...record,
    lifecycleState: "saved",
    temporaryExpiresAt: "",
    updatedAt: now.toISOString(),
  });
}

export function confirmAction(record, values, now = new Date()) {
  return normalizeLifecycle({
    ...record,
    ...values,
    lifecycleState: "active",
    temporaryExpiresAt: "",
    updatedAt: now.toISOString(),
  });
}

export function recordEcho(record, { status, note = "" }, now = new Date()) {
  return normalizeLifecycle({
    ...record,
    echoStatus: status,
    echoNote: note,
    updatedAt: now.toISOString(),
  });
}

export function isTemporaryExpired(record, now = new Date()) {
  if (record?.lifecycleState !== "temporary") return false;
  const expiresAt = Date.parse(record.temporaryExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
