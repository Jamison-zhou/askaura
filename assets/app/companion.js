const ONE_MONTH_MS = 28 * 24 * 60 * 60 * 1000;
const TOP_LIMIT = 6;
const OBSERVATION_LIMIT = 5;
const QUIET_LIMIT = 6;

const ACTION_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "be",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "one",
  "the",
  "to",
  "with",
  "your",
  "you",
]);

export function deriveCompanionSnapshot(records, now = new Date()) {
  const usableRecords = Array.isArray(records) ? records.filter(isRecordLike) : [];
  const sortedRecords = [...usableRecords].sort((a, b) => timestampOf(b) - timestampOf(a));
  const modeCounts = countModes(usableRecords);
  const actionStatusCounts = countActionStatuses(usableRecords);
  const topSymbols = collectTopSymbols(usableRecords).slice(0, TOP_LIMIT);
  const actionWords = collectActionWords(usableRecords).slice(0, TOP_LIMIT);
  const observationTrail = buildObservationTrail(sortedRecords);
  const oneMonthEcho = buildOneMonthEcho(sortedRecords, now);
  const quietFlags = buildQuietFlags(usableRecords).slice(0, QUIET_LIMIT);

  return {
    totalRecords: usableRecords.length,
    modeCounts,
    topSymbols,
    actionWords,
    actionStatusCounts,
    observationTrail,
    oneMonthEcho,
    quietFlags,
  };
}

function isRecordLike(record) {
  return record && typeof record === "object" && !Array.isArray(record);
}

function countModes(records) {
  return records.reduce((counts, record) => {
    const mode = cleanText(record.mode, "unknown");
    counts[mode] = (counts[mode] || 0) + 1;
    return counts;
  }, {});
}

function countActionStatuses(records) {
  const base = {
    done: 0,
    not_done: 0,
    skipped: 0,
    not_fit: 0,
  };

  return records.reduce((counts, record) => {
    const status = cleanText(record.actionStatus, "");
    if (status in counts) {
      counts[status] += 1;
    } else if (status) {
      counts.other = (counts.other || 0) + 1;
    }
    return counts;
  }, base);
}

function collectTopSymbols(records) {
  const symbols = new Map();

  records.forEach((record, recordIndex) => {
    const candidates = symbolCandidates(record);
    candidates.forEach((name, candidateIndex) => {
      if (!name) return;
      const key = normalizeKey(name);
      if (!key) return;

      const existing = symbols.get(key);
      if (existing) {
        existing.count += 1;
        existing.modes.add(cleanText(record.mode, "unknown"));
        return;
      }

      symbols.set(key, {
        name,
        count: 1,
        firstSeen: recordIndex * 10 + candidateIndex,
        modes: new Set([cleanText(record.mode, "unknown")]),
      });
    });
  });

  return Array.from(symbols.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.firstSeen - b.firstSeen;
    })
    .map(({ name, count, modes }) => ({
      name,
      count,
      modes: Array.from(modes),
    }));
}

function symbolCandidates(record) {
  const values = [];
  const cards = Array.isArray(record.cards) ? record.cards : [];

  cards.forEach((card) => {
    if (!card || typeof card !== "object") return;
    values.push(cleanText(card.name, ""));
    values.push(cleanText(card.label, ""));
  });

  const gua = record.gua && typeof record.gua === "object" ? record.gua : null;
  if (gua) {
    values.push(cleanText(gua.name, ""));
    values.push(cleanText(gua.en, ""));
  }

  const anchor = record.anchor && typeof record.anchor === "object" ? record.anchor : null;
  if (anchor) {
    values.push(cleanText(anchor.color, ""));
    values.push(cleanText(anchor.object, ""));
    values.push(cleanText(anchor.moment, ""));
  }

  values.push(cleanText(record.title, ""));
  values.push(cleanText(record.imageAlt, ""));

  return values.filter(Boolean);
}

function collectActionWords(records) {
  const counts = new Map();

  records.forEach((record, recordIndex) => {
    const words = tokenizeAction(cleanText(record.action, ""));
    words.forEach((word, wordIndex) => {
      const entry = counts.get(word);
      if (entry) {
        entry.count += 1;
        return;
      }

      counts.set(word, {
        word,
        count: 1,
        firstSeen: recordIndex * 100 + wordIndex,
      });
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.firstSeen - b.firstSeen;
    })
    .map(({ word, count }) => ({ word, count }));
}

function tokenizeAction(action) {
  return action
    .toLowerCase()
    .match(/[a-z]+(?:'[a-z]+)?/g)
    ?.filter((word) => word.length > 1 && !ACTION_STOP_WORDS.has(word)) || [];
}

function buildObservationTrail(records) {
  return records.slice(0, OBSERVATION_LIMIT).map((record) => ({
    createdAt: cleanText(record.createdAt, ""),
    mode: cleanText(record.mode, "unknown"),
    symbol: symbolForTrail(record),
    action: cleanText(record.action, ""),
    actionStatus: cleanText(record.actionStatus, ""),
    summary: buildRecordSummary(record),
  }));
}

function buildRecordSummary(record) {
  const parts = [
    symbolForTrail(record),
    cleanText(record.action, ""),
    cleanText(record.reviewNote, ""),
  ].filter(Boolean);

  if (parts.length) return parts.join(" · ");
  return cleanText(record.title, "") || cleanText(record.answer, "");
}

function symbolForTrail(record) {
  const symbols = symbolCandidates(record);
  return symbols[0] || "";
}

function buildOneMonthEcho(records, now) {
  const threshold = timestampOf(now) - ONE_MONTH_MS;
  const candidate = records.find((record) => {
    const createdAt = timestampOf(record.createdAt);
    return createdAt > 0 && createdAt <= threshold;
  });

  if (!candidate) return null;

  const ageDays = Math.floor((timestampOf(now) - timestampOf(candidate.createdAt)) / (24 * 60 * 60 * 1000));
  return {
    createdAt: cleanText(candidate.createdAt, ""),
    mode: cleanText(candidate.mode, "unknown"),
    title: cleanText(candidate.title, ""),
    action: cleanText(candidate.action, ""),
    actionStatus: cleanText(candidate.actionStatus, ""),
    symbol: symbolForTrail(candidate),
    ageDays,
  };
}

function buildQuietFlags(records) {
  const flags = [];
  const favoriteCount = records.filter((record) => Boolean(record.favorite)).length;
  const reviewCount = records.filter((record) => cleanText(record.reviewNote, "")).length;
  const followupCount = records.reduce((count, record) => count + (Array.isArray(record.followups) ? record.followups.length : 0), 0);
  const doneCount = records.filter((record) => cleanText(record.actionStatus, "") === "done").length;
  const clarifiedCount = records.filter((record) => Boolean(record.clarificationOf)).length;

  if (favoriteCount) {
    flags.push({ key: "favorites", label: "Favorites", count: favoriteCount });
  }
  if (reviewCount) {
    flags.push({ key: "review_notes", label: "Review notes", count: reviewCount });
  }
  if (followupCount) {
    flags.push({ key: "followups", label: "Follow-ups", count: followupCount });
  }
  if (doneCount) {
    flags.push({ key: "done_actions", label: "Completed actions", count: doneCount });
  }
  if (clarifiedCount) {
    flags.push({ key: "clarifications", label: "Clarifications", count: clarifiedCount });
  }

  return flags.sort((a, b) => b.count - a.count);
}

function normalizeKey(value) {
  return cleanText(value, "").trim().toLowerCase();
}

function cleanText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function timestampOf(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }
  return 0;
}
