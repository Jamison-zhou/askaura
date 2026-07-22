const ACTIVE_LIMIT = 3;

export function deriveHomeState(records = [], now = new Date()) {
  const normalized = Array.isArray(records) ? records.filter(Boolean) : [];
  const echoDue = normalized
    .filter((record) => record.lifecycleState === "active" && isDue(record.echoDueAt, now))
    .sort((left, right) => timestamp(left.echoDueAt) - timestamp(right.echoDueAt))[0];
  if (echoDue) return { kind: "echo-due", record: echoDue };

  const resumable = normalized
    .filter((record) => record.lifecycleState === "temporary")
    .sort((left, right) => timestamp(right.updatedAt || right.createdAt) - timestamp(left.updatedAt || left.createdAt))[0];
  if (resumable) return { kind: "resume", record: resumable };

  const active = normalized
    .filter((record) => record.lifecycleState === "active")
    .sort((left, right) => timestamp(right.updatedAt || right.createdAt) - timestamp(left.updatedAt || left.createdAt))[0];
  if (active) return { kind: "active", record: active };
  if (normalized.length) return { kind: "returning", record: normalized[0] };
  return { kind: "new-user", record: null };
}

export function deriveJourney(records = []) {
  const groups = {
    active: [],
    paused: [],
    closed: [],
    saved: [],
    temporary: [],
    legacy: [],
  };
  const themes = new Map();

  (Array.isArray(records) ? records : []).filter(Boolean).forEach((record) => {
    const state = Object.hasOwn(groups, record.lifecycleState) ? record.lifecycleState : "legacy";
    groups[state].push(record);
    const theme = text(record.actionTheme);
    if (theme && state !== "temporary" && state !== "legacy") {
      const current = themes.get(theme) || { theme, count: 0, changed: 0 };
      current.count += 1;
      if (record.echoStatus === "changed") current.changed += 1;
      themes.set(theme, current);
    }
  });

  groups.active.sort((left, right) => timestamp(left.echoDueAt) - timestamp(right.echoDueAt));
  ["paused", "closed", "saved", "temporary", "legacy"].forEach((key) => {
    groups[key].sort((left, right) => timestamp(right.updatedAt || right.createdAt) - timestamp(left.updatedAt || left.createdAt));
  });

  return {
    ...groups,
    themes: Array.from(themes.values()).sort((left, right) => right.count - left.count || left.theme.localeCompare(right.theme)),
    activeLimit: {
      count: groups.active.length,
      limit: ACTIVE_LIMIT,
      reached: groups.active.length >= ACTIVE_LIMIT,
    },
  };
}

function isDue(value, now) {
  const dueAt = timestamp(value);
  return dueAt > 0 && dueAt <= now.getTime();
}

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
