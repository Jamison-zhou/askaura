const BUSY_STATES = new Set(["clarifying", "drawing", "streaming", "saving"]);
const MODE_TONES = new Map([
  ["tarot", "tarot"],
  ["daily", "tarot"],
  ["meihua", "meihua"],
  ["dual", "dual"],
]);

export function isBusyState(state) {
  return BUSY_STATES.has(String(state || ""));
}

export function nextToneForMode(mode) {
  return MODE_TONES.get(String(mode || "")) || "tarot";
}

export function viewStateClass({ hasResult = false, isBusy = false } = {}) {
  if (isBusy) return "is-busy";
  if (hasResult) return "has-result";
  return "is-idle";
}
