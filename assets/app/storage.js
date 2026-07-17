import {
  DAILY_ANCHOR_KEY,
  HISTORY_KEY,
  HISTORY_LIMIT,
  LEGACY_DAILY_ANCHOR_KEY,
  LEGACY_HISTORY_KEY,
  mergeHistoryRecords,
  normalizeHistory,
  normalizeHistoryRecord
} from "./history-store.js";
import { isTemporaryExpired } from "./observation-lifecycle.js";

export { HISTORY_LIMIT };

export function createStorage(storage = globalThis.localStorage) {
  return {
    get(key, fallback) {
      if (!storage) return fallback;

      try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      if (!storage) return;

      storage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      if (!storage) return;

      storage.removeItem(key);
    },
    has(key) {
      if (!storage) return false;

      return storage.getItem(key) !== null;
    },
  };
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function loadHistory(store = createStorage()) {
  const records = store.has?.(HISTORY_KEY)
    ? store.get(HISTORY_KEY, [])
    : store.get(LEGACY_HISTORY_KEY, []);
  return normalizeHistory(records);
}

export function saveHistoryRecord(store = createStorage(), record) {
  return mergeHistory(store, [record]);
}

export function mergeHistory(store = createStorage(), records = []) {
  const merged = mergeHistoryRecords(loadHistory(store), records);
  store.set(HISTORY_KEY, merged);
  return merged;
}

export function clearHistory(store = createStorage()) {
  store.set(HISTORY_KEY, []);
}

export function cleanupExpiredTemporaryRecords(store = createStorage(), now = new Date()) {
  const records = loadHistory(store);
  const retained = records.filter((record) => !isTemporaryExpired(record, now));
  if (retained.length !== records.length) store.set(HISTORY_KEY, retained);
  return retained;
}

export function loadDailyAnchor(store = createStorage(), dateKey = todayKey()) {
  const anchors = store.has?.(DAILY_ANCHOR_KEY)
    ? store.get(DAILY_ANCHOR_KEY, {})
    : store.get(LEGACY_DAILY_ANCHOR_KEY, {});
  return normalizeHistoryRecord(anchors?.[dateKey]) || null;
}

export function saveDailyAnchor(store = createStorage(), dateKey = todayKey(), record) {
  const anchors = store.get(DAILY_ANCHOR_KEY, {});
  const normalized = normalizeHistoryRecord(record);
  if (!normalized) return null;

  anchors[dateKey] = normalized;
  store.set(DAILY_ANCHOR_KEY, anchors);
  return normalized;
}

export function clearDailyAnchors(store = createStorage()) {
  store.set(DAILY_ANCHOR_KEY, {});
}
