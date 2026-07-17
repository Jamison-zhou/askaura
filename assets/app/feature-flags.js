const STORAGE_KEY = "askaura.systemConvergenceV1";

export function systemConvergenceEnabled(storage = globalThis.localStorage) {
  const override = storage?.getItem?.(STORAGE_KEY);
  if (override === "enabled") return true;
  if (override === "disabled") return false;
  return false;
}

export function setSystemConvergenceEnabled(enabled, storage = globalThis.localStorage) {
  storage?.setItem?.(STORAGE_KEY, enabled ? "enabled" : "disabled");
}
