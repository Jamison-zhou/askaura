const HISTORY_KEY = "rill.history.v1";
const DAILY_ANCHOR_KEY = "rill.dailyAnchors.v1";

export const HISTORY_LIMIT = 21;

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
  };
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function loadHistory(store = createStorage()) {
  const records = store.get(HISTORY_KEY, []);
  return normalizeHistory(records);
}

export function saveHistoryRecord(store = createStorage(), record) {
  return mergeHistory(store, [record]);
}

export function mergeHistory(store = createStorage(), records = []) {
  const merged = normalizeHistory([...records, ...loadHistory(store)]);
  store.set(HISTORY_KEY, merged);
  return merged;
}

export function clearHistory(store = createStorage()) {
  store.remove(HISTORY_KEY);
}

export function loadDailyAnchor(store = createStorage(), dateKey = todayKey()) {
  const anchors = store.get(DAILY_ANCHOR_KEY, {});
  return normalizeRecord(anchors[dateKey]) || null;
}

export function saveDailyAnchor(store = createStorage(), dateKey = todayKey(), record) {
  const anchors = store.get(DAILY_ANCHOR_KEY, {});
  const normalized = normalizeRecord(record);
  if (!normalized) return null;

  anchors[dateKey] = normalized;
  store.set(DAILY_ANCHOR_KEY, anchors);
  return normalized;
}

export function clearDailyAnchors(store = createStorage()) {
  store.remove(DAILY_ANCHOR_KEY);
}

function normalizeHistory(records) {
  if (!Array.isArray(records)) return [];

  const byId = new Map();
  records.forEach((record) => {
    const normalized = normalizeRecord(record);
    if (!normalized) return;

    const existing = byId.get(normalized.id);
    if (!existing || timestampOf(normalized) >= timestampOf(existing)) {
      byId.set(normalized.id, normalized);
    }
  });

  return Array.from(byId.values())
    .sort((a, b) => timestampOf(b) - timestampOf(a))
    .slice(0, HISTORY_LIMIT);
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return null;

  const id = stringValue(record.id) || cryptoId();
  const createdAt = stringValue(record.createdAt) || new Date().toISOString();
  const mode = stringValue(record.mode) || "tarot";
  const title = stringValue(record.title) || "";
  const question = stringValue(record.question);
  const answer = stringValue(record.answer) || "";

  return {
    id,
    mode,
    title,
    question,
    answer,
    language: stringValue(record.language),
    action: stringValue(record.action),
    imageSrc: stringValue(record.imageSrc),
    imageAlt: stringValue(record.imageAlt),
    reading: plainObject(record.reading),
    report: plainObject(record.report),
    gua: plainObject(record.gua),
    anchor: record.anchor && typeof record.anchor === "object" ? record.anchor : null,
    createdAt,
    updatedAt: stringValue(record.updatedAt) || createdAt,
  };
}

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function timestampOf(record) {
  const value = Date.parse(record.createdAt);
  return Number.isNaN(value) ? 0 : value;
}

function cryptoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `rill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
