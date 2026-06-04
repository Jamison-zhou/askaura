import { CORS_HEADERS, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { DenoEnv } from "../_shared/llm.ts";

type PublicSubmission = {
  id: string;
  mode: string;
  theme: string;
  action: string;
  symbol: string;
  category: string;
  language: string;
  sourceCreatedAt: string;
  createdAt: string;
  reactions: {
    same: number;
    useful: number;
  };
};

function cleanText(value: unknown, max = 600): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanMode(value: unknown): string {
  const mode = cleanText(value, 20);
  return ["tarot", "meihua", "dual", "daily"].includes(mode) ? mode : "daily";
}

function cleanReaction(value: unknown): "same" | "useful" | "" {
  const reaction = cleanText(value, 20);
  return reaction === "same" || reaction === "useful" ? reaction : "";
}

function normalizeBody(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function parseToken(text: unknown, key: string): string {
  const source = typeof text === "string" ? text : "";
  const pattern = new RegExp(`\\[${key}\\]([\\s\\S]*?)(?=\\n\\[[A-Z_]+\\]|$)`, "i");
  return cleanText(source.match(pattern)?.[1], 700);
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function serviceHeaders(privateKey: string): HeadersInit {
  return {
    apikey: privateKey,
    Authorization: `Bearer ${privateKey}`,
    "Content-Type": "application/json",
  };
}

async function fetchUser(baseUrl: string, anonKey: string, authHeader: string | null): Promise<{ id: string } | null> {
  const bearer = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${bearer}`,
    },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return typeof user?.id === "string" ? { id: user.id } : null;
}

function primarySymbol(record: Record<string, unknown>): string {
  const cards = Array.isArray(record.cards) ? record.cards : [];
  const primaryCard = normalizeBody(cards[0]);
  const gua = normalizeBody(record.gua);
  return cleanText(primaryCard.name, 80)
    || cleanText(gua.name, 80)
    || cleanText(record.image_alt, 80)
    || cleanText(record.title, 80);
}

function categoryFromMode(mode: unknown): string {
  switch (cleanMode(mode)) {
    case "daily":
      return "daily";
    case "tarot":
      return "tarot";
    case "meihua":
      return "meihua";
    default:
      return "general";
  }
}

function redactSubmissionPayload(record: Record<string, unknown>) {
  return {
    theme: cleanText(
      parseToken(record.answer, "JUDGMENT")
        || parseToken(record.answer, "CORE_QUESTION")
        || cleanText(record.action, 220),
      220,
    ),
    action: cleanText(parseToken(record.answer, "ACTION") || cleanText(record.action, 180), 180),
    symbol: cleanText(primarySymbol(record), 80),
    category: categoryFromMode(record.mode),
  };
}

function toPublicSubmission(
  row: Record<string, unknown>,
  reactions: Record<string, { same: number; useful: number }>,
): PublicSubmission {
  const id = cleanText(row.id, 80);
  return {
    id,
    mode: cleanMode(row.mode),
    theme: cleanText(row.theme, 220),
    action: cleanText(row.action, 180),
    symbol: cleanText(row.symbol, 80),
    category: cleanText(row.category, 40) || "general",
    language: cleanText(row.language, 8) || "zh",
    sourceCreatedAt: cleanText(row.source_created_at, 80),
    createdAt: cleanText(row.created_at, 80),
    reactions: reactions[id] || { same: 0, useful: 0 },
  };
}

async function getOwnedRecord(
  baseUrl: string,
  privateKey: string,
  userId: string,
  recordId: string,
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({
    select: "*",
    id: `eq.${recordId}`,
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const response = await fetch(`${baseUrl}/rest/v1/askaura_reflection_records?${params}`, {
    headers: serviceHeaders(privateKey),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function getOwnedSubmission(
  baseUrl: string,
  privateKey: string,
  userId: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({
    select: "id,user_id,record_id,revoked_at",
    id: `eq.${id}`,
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const response = await fetch(`${baseUrl}/rest/v1/askaura_resonance_submissions?${params}`, {
    headers: serviceHeaders(privateKey),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function getPublicSubmission(
  baseUrl: string,
  privateKey: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({
    select: "id",
    id: `eq.${id}`,
    revoked_at: "is.null",
    limit: "1",
  });
  const response = await fetch(`${baseUrl}/rest/v1/askaura_resonance_submissions?${params}`, {
    headers: serviceHeaders(privateKey),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function submitResonance(
  baseUrl: string,
  privateKey: string,
  userId: string,
  body: Record<string, unknown>,
) {
  const recordId = cleanText(body.recordId, 160);
  if (!recordId) return jsonResponse({ error: "recordId required" }, 400);

  const record = await getOwnedRecord(baseUrl, privateKey, userId, recordId);
  if (!record) return jsonResponse({ error: "Record not found" }, 404);

  const payload = redactSubmissionPayload(record);
  if (!payload.theme || !payload.action) {
    return jsonResponse({ error: "Record not ready for resonance" }, 400);
  }

  const now = new Date().toISOString();
  const response = await fetch(`${baseUrl}/rest/v1/askaura_resonance_submissions?on_conflict=user_id,record_id`, {
    method: "POST",
    headers: {
      ...serviceHeaders(privateKey),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{
      user_id: userId,
      record_id: recordId,
      mode: cleanMode(record.mode),
      theme: payload.theme,
      action: payload.action,
      symbol: payload.symbol,
      category: payload.category,
      language: cleanText(record.language, 8) || "zh",
      source_created_at: cleanText(record.created_at, 80) || null,
      revoked_at: null,
      updated_at: now,
    }]),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;
  return jsonResponse({
    ok: true,
    submission: row ? toPublicSubmission(row, {}) : null,
  });
}

async function revokeResonance(
  baseUrl: string,
  privateKey: string,
  userId: string,
  body: Record<string, unknown>,
) {
  const id = cleanText(body.id, 80);
  if (!id) return jsonResponse({ error: "id required" }, 400);

  const row = await getOwnedSubmission(baseUrl, privateKey, userId, id);
  if (!row) return jsonResponse({ error: "Submission not found" }, 404);

  const now = new Date().toISOString();
  const params = new URLSearchParams({
    id: `eq.${id}`,
    user_id: `eq.${userId}`,
  });
  const response = await fetch(`${baseUrl}/rest/v1/askaura_resonance_submissions?${params}`, {
    method: "PATCH",
    headers: {
      ...serviceHeaders(privateKey),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      revoked_at: now,
      updated_at: now,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  return jsonResponse({ ok: true });
}

async function loadReactionCounts(
  baseUrl: string,
  privateKey: string,
  ids: string[],
): Promise<Record<string, { same: number; useful: number }>> {
  if (!ids.length) return {};
  const params = new URLSearchParams({
    select: "submission_id,reaction",
    submission_id: `in.(${ids.join(",")})`,
  });
  const response = await fetch(`${baseUrl}/rest/v1/askaura_resonance_reactions?${params}`, {
    headers: serviceHeaders(privateKey),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  const counts: Record<string, { same: number; useful: number }> = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const submissionId = cleanText(row?.submission_id, 80);
    const reaction = cleanReaction(row?.reaction);
    if (!submissionId || !reaction) continue;
    counts[submissionId] ||= { same: 0, useful: 0 };
    counts[submissionId][reaction] += 1;
  }
  return counts;
}

async function listResonance(
  baseUrl: string,
  privateKey: string,
  body: Record<string, unknown>,
) {
  const language = cleanText(body.language, 8) || "zh";
  const category = cleanText(body.category, 40);
  const limit = clampNumber(body.limit, 20, 1, 50);
  const params = new URLSearchParams({
    select: "id,mode,theme,action,symbol,category,language,source_created_at,created_at",
    revoked_at: "is.null",
    language: `eq.${language}`,
    order: "created_at.desc",
    limit: String(limit),
  });
  if (category && category !== "all") {
    params.set("category", `eq.${category}`);
  }
  const response = await fetch(`${baseUrl}/rest/v1/askaura_resonance_submissions?${params}`, {
    headers: serviceHeaders(privateKey),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  const ids = (Array.isArray(rows) ? rows : []).map((row) => cleanText(row?.id, 80)).filter(Boolean);
  const reactions = await loadReactionCounts(baseUrl, privateKey, ids);
  return jsonResponse({
    items: (Array.isArray(rows) ? rows : []).map((row) => toPublicSubmission(row, reactions)),
  });
}

function fingerprintSource(request: Request, submissionId: string, reaction: string, salt: string): string {
  return [
    cleanText(request.headers.get("cf-connecting-ip"), 120),
    cleanText(request.headers.get("x-forwarded-for"), 200),
    cleanText(request.headers.get("user-agent"), 240),
    cleanText(request.headers.get("accept-language"), 80),
    submissionId,
    reaction,
    salt,
  ].join("|");
}

async function reactToResonance(
  env: DenoEnv,
  baseUrl: string,
  privateKey: string,
  request: Request,
  body: Record<string, unknown>,
) {
  const submissionId = cleanText(body.id ?? body.submissionId, 80);
  const reaction = cleanReaction(body.reaction);
  if (!submissionId) return jsonResponse({ error: "id required" }, 400);
  if (!reaction) return jsonResponse({ error: "reaction required" }, 400);

  const row = await getPublicSubmission(baseUrl, privateKey, submissionId);
  if (!row) return jsonResponse({ error: "Submission not found" }, 404);

  const salt = env.get("RESONANCE_FINGERPRINT_SALT") || "";
  const anonFingerprint = await sha256Hex(fingerprintSource(request, submissionId, reaction, salt));
  const response = await fetch(`${baseUrl}/rest/v1/askaura_resonance_reactions`, {
    method: "POST",
    headers: {
      ...serviceHeaders(privateKey),
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify([{
      submission_id: submissionId,
      reaction,
      anon_fingerprint: anonFingerprint,
    }]),
  });
  if (!response.ok) throw new Error(await response.text());
  return jsonResponse({ ok: true });
}

Deno.serve(async (request: Request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const env = new DenoEnv();
    const baseUrl = env.require("SUPABASE_URL").replace(/\/+$/, "");
    const privateKey = env.require(["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"));
    const body = normalizeBody(await request.json().catch(() => null));
    const action = cleanText(body.action, 32);

    if (action === "list") {
      return await listResonance(baseUrl, privateKey, body);
    }

    if (action === "react") {
      return await reactToResonance(env, baseUrl, privateKey, request, body);
    }

    const anonKey = env.require("SUPABASE_ANON_KEY");
    const user = await fetchUser(baseUrl, anonKey, request.headers.get("Authorization"));
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (action === "submit") {
      return await submitResonance(baseUrl, privateKey, user.id, body);
    }

    if (action === "revoke") {
      return await revokeResonance(baseUrl, privateKey, user.id, body);
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Resonance pool request failed" }, 500, CORS_HEADERS);
  }
});
