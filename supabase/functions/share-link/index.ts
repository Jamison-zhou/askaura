import { CORS_HEADERS, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { DenoEnv } from "../_shared/llm.ts";

type SharePayload = {
  title: string;
  mode: string;
  symbol: string;
  summary: string;
  action: string;
  doText: string;
  dontText: string;
  watchText: string;
  question: string;
  reviewNote: string;
  createdAt: string;
};

function cleanText(value: unknown, max = 600): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function normalizeBody(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function parseToken(text: unknown, key: string): string {
  const source = typeof text === "string" ? text : "";
  const pattern = new RegExp(`\\[${key}\\]([\\s\\S]*?)(?=\\n\\[[A-Z_]+\\]|$)`, "i");
  return cleanText(source.match(pattern)?.[1], 700);
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function serviceHeaders(serviceKey: string): HeadersInit {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
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

function payloadFromRecord(row: Record<string, unknown>, includeQuestion: boolean): SharePayload {
  const cards = Array.isArray(row.cards) ? row.cards : [];
  const primaryCard = normalizeBody(cards[0]);
  const gua = normalizeBody(row.gua);
  const answer = row.answer;
  const symbol = cleanText(primaryCard.name, 120)
    || cleanText(gua.name, 120)
    || cleanText(row.image_alt, 120)
    || cleanText(row.title, 120);
  const summary = parseToken(answer, "JUDGMENT")
    || parseToken(answer, "CORE_QUESTION")
    || parseToken(answer, "THEME")
    || cleanText(row.answer, 700);
  const action = cleanText(row.action, 420) || parseToken(answer, "ACTION") || parseToken(answer, "NEXT_ACTION");
  return {
    title: cleanText(row.title, 120),
    mode: cleanText(row.mode, 32),
    symbol,
    summary,
    action,
    doText: action,
    dontText: "",
    watchText: "",
    question: includeQuestion ? cleanText(row.question, 420) : "",
    reviewNote: cleanText(row.review_note, 420),
    createdAt: cleanText(row.created_at, 80),
  };
}

async function getOwnedRecord(
  baseUrl: string,
  serviceKey: string,
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
    headers: serviceHeaders(serviceKey),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function createShareLink(
  baseUrl: string,
  serviceKey: string,
  origin: string,
  userId: string,
  body: Record<string, unknown>,
) {
  const recordId = cleanText(body.recordId, 160);
  if (!recordId) return jsonResponse({ error: "recordId required" }, 400);
  const includeQuestion = body.includeQuestion === true;
  const row = await getOwnedRecord(baseUrl, serviceKey, userId, recordId);
  if (!row) return jsonResponse({ error: "Record not found" }, 404);

  const token = createToken();
  const tokenHash = await sha256Hex(token);
  const payload = payloadFromRecord(row, includeQuestion);
  const response = await fetch(`${baseUrl}/rest/v1/askaura_share_links`, {
    method: "POST",
    headers: {
      ...serviceHeaders(serviceKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify([{
      token_hash: tokenHash,
      user_id: userId,
      record_id: recordId,
      payload,
      include_question: includeQuestion,
    }]),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  const shareId = Array.isArray(rows) ? rows[0]?.id : "";
  return jsonResponse({
    id: shareId,
    token,
    url: `${origin.replace(/\/+$/, "")}/index.html?share=${encodeURIComponent(token)}`,
  });
}

async function revokeShareLink(
  baseUrl: string,
  serviceKey: string,
  userId: string,
  body: Record<string, unknown>,
) {
  const id = cleanText(body.id, 80);
  if (!id) return jsonResponse({ error: "id required" }, 400);
  const params = new URLSearchParams({
    id: `eq.${id}`,
    user_id: `eq.${userId}`,
  });
  const response = await fetch(`${baseUrl}/rest/v1/askaura_share_links?${params}`, {
    method: "PATCH",
    headers: {
      ...serviceHeaders(serviceKey),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  return jsonResponse({ ok: true });
}

async function getShareLink(baseUrl: string, serviceKey: string, body: Record<string, unknown>) {
  const token = cleanText(body.token, 200);
  if (!token) return jsonResponse({ error: "token required" }, 400);
  const tokenHash = await sha256Hex(token);
  const params = new URLSearchParams({
    select: "id,payload,revoked_at,expires_at",
    token_hash: `eq.${tokenHash}`,
    limit: "1",
  });
  const response = await fetch(`${baseUrl}/rest/v1/askaura_share_links?${params}`, {
    headers: serviceHeaders(serviceKey),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || row.revoked_at) return jsonResponse({ error: "Share link not found" }, 404);
  if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) {
    return jsonResponse({ error: "Share link expired" }, 410);
  }
  return jsonResponse({ id: row.id, payload: row.payload });
}

Deno.serve(async (request: Request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const env = new DenoEnv();
    const baseUrl = env.require("SUPABASE_URL").replace(/\/+$/, "");
    const serviceKey = env.require("SUPABASE_SERVICE_ROLE_KEY");
    const body = normalizeBody(await request.json().catch(() => null));
    const action = cleanText(body.action, 32);

    if (action === "get") {
      return await getShareLink(baseUrl, serviceKey, body);
    }

    const anonKey = env.require("SUPABASE_ANON_KEY");
    const user = await fetchUser(baseUrl, anonKey, request.headers.get("Authorization"));
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (action === "create") {
      const origin = request.headers.get("x-askaura-origin") || "https://askaura.vercel.app";
      return await createShareLink(baseUrl, serviceKey, origin, user.id, body);
    }

    if (action === "revoke") {
      return await revokeShareLink(baseUrl, serviceKey, user.id, body);
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Share link request failed" }, 500, CORS_HEADERS);
  }
});
