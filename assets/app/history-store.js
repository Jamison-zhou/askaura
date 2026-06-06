export const HISTORY_KEY = "askaura.history.v1";
export const DAILY_ANCHOR_KEY = "askaura.dailyAnchors.v1";
export const LEGACY_HISTORY_KEY = "rill.history.v1";
export const LEGACY_DAILY_ANCHOR_KEY = "rill.dailyAnchors.v1";

export const HISTORY_LIMIT = 60;

export function normalizeHistory(records, { limit = HISTORY_LIMIT } = {}) {
  if (!Array.isArray(records)) return [];

  const byId = new Map();
  records.forEach((record) => {
    const normalized = normalizeHistoryRecord(record);
    if (!normalized) return;

    const existing = byId.get(normalized.id);
    if (!existing || historyTimestamp(normalized) >= historyTimestamp(existing)) {
      byId.set(normalized.id, normalized);
    }
  });

  return Array.from(byId.values())
    .sort((a, b) => historyTimestamp(b) - historyTimestamp(a))
    .slice(0, limit);
}

export function mergeHistoryRecords(existingRecords = [], incomingRecords = [], { limit = HISTORY_LIMIT } = {}) {
  return normalizeHistory([...incomingRecords, ...existingRecords], { limit });
}

export function normalizeHistoryRecord(record) {
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
    actionStatus: normalizeActionStatus(record.actionStatus),
    reviewAt: stringValue(record.reviewAt),
    reviewNote: stringValue(record.reviewNote),
    favorite: Boolean(record.favorite),
    spreadType: normalizeSpreadType(record.spreadType),
    imageSrc: stringValue(record.imageSrc),
    imageAlt: stringValue(record.imageAlt),
    cards: normalizeCards(record.cards),
    reading: plainObject(record.reading),
    report: plainObject(record.report),
    followups: normalizeFollowups(record.followups),
    clarificationOf: plainObject(record.clarificationOf),
    gua: plainObject(record.gua),
    anchor: record.anchor && typeof record.anchor === "object" ? record.anchor : null,
    createdAt,
    updatedAt: stringValue(record.updatedAt) || createdAt,
  };
}

export function historyRecordToRow(record) {
  return {
    id: record.id,
    mode: record.mode,
    title: record.title || "",
    question: record.question || "",
    answer: record.answer || "",
    action: record.action || "",
    action_status: record.actionStatus || "",
    review_at: record.reviewAt || null,
    review_note: record.reviewNote || "",
    is_favorite: Boolean(record.favorite),
    spread_type: record.spreadType || "single",
    image_src: record.imageSrc || "",
    image_alt: record.imageAlt || "",
    cards: Array.isArray(record.cards) ? record.cards : [],
    gua: record.gua || null,
    anchor: record.anchor || null,
    followups: Array.isArray(record.followups) ? record.followups : [],
    clarification_of: record.clarificationOf || null,
    language: record.language || "zh",
    created_at: record.createdAt,
    updated_at: record.updatedAt || record.createdAt,
  };
}

export function historyRecordFromRow(row) {
  return {
    id: row.id,
    mode: row.mode,
    title: row.title || "",
    question: row.question || "",
    answer: row.answer || "",
    action: row.action || "",
    actionStatus: row.action_status || "",
    reviewAt: row.review_at || "",
    reviewNote: row.review_note || "",
    favorite: Boolean(row.is_favorite),
    spreadType: row.spread_type || "single",
    imageSrc: row.image_src || "",
    imageAlt: row.image_alt || "",
    cards: Array.isArray(row.cards) ? row.cards : [],
    gua: row.gua || null,
    anchor: row.anchor || null,
    followups: Array.isArray(row.followups) ? row.followups : [],
    clarificationOf: row.clarification_of || null,
    language: row.language || "zh",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export function historyTimestamp(record) {
  const value = Math.max(Date.parse(record.createdAt), Date.parse(record.updatedAt));
  return Number.isNaN(value) ? 0 : value;
}

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function normalizeFollowups(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const question = stringValue(item.question);
    const answer = stringValue(item.answer);
    if (!question || !answer) return null;
    const createdAt = stringValue(item.createdAt) || new Date().toISOString();
    return {
      id: stringValue(item.id) || cryptoId(),
      question,
      answer,
      sourceResultId: stringValue(item.sourceResultId),
      createdAt,
    };
  }).filter(Boolean);
}

function normalizeCards(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const name = stringValue(item.name);
    const label = stringValue(item.label);
    const imageSrc = stringValue(item.imageSrc);
    if (!name && !label && !imageSrc) return null;
    return {
      name,
      label,
      position: stringValue(item.position),
      orientation: item.orientation === "reversed" ? "reversed" : "upright",
      imageSrc,
      imageAlt: stringValue(item.imageAlt),
    };
  }).filter(Boolean);
}

function normalizeActionStatus(value) {
  return ["done", "not_done", "skipped", "not_fit"].includes(value) ? value : "";
}

function normalizeSpreadType(value) {
  return ["single", "three_current_resistance_next", "relationship_tension", "choice_a_b_reminder"].includes(value)
    ? value
    : "single";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cryptoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `askaura-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
