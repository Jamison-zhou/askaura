import { createStorage, loadHistory, mergeHistory } from "./storage.js";

export const SESSION_KEY = "rill.authSession.v1";

const HISTORY_TABLE = "rill_reflection_records";
const DAILY_TABLE = "rill_daily_anchors";

export function createSyncClient({
  supabaseUrl = globalThis.RILL_SUPABASE_URL,
  anonKey = globalThis.RILL_SUPABASE_ANON_KEY,
  fetchImpl = globalThis.fetch,
  store = createStorage(),
} = {}) {
  const baseUrl = normalizeSupabaseUrl(supabaseUrl);

  async function signUpWithPassword(email, password) {
    const result = await requestAuth("/auth/v1/signup", { email, password });
    if (result.access_token) {
      store.set(SESSION_KEY, result);
      return { ...result, status: "signed-in" };
    }

    return { ...result, status: "pending" };
  }

  async function signInWithPassword(email, password) {
    const session = await requestAuth("/auth/v1/token?grant_type=password", { email, password });
    store.set(SESSION_KEY, session);
    return session;
  }

  async function requestPasswordReset(email, redirectTo) {
    const suffix = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
    await requestAuth(`/auth/v1/recover${suffix}`, { email });
    return { status: "sent" };
  }

  async function updatePassword(password) {
    const session = getSession();
    if (!session?.access_token) return { status: "signed-out" };

    const user = await requestUserUpdate({ password }, session.access_token);
    store.set(SESSION_KEY, { ...session, user });
    return { status: "updated", user };
  }

  function signOut() {
    store.set(SESSION_KEY, null);
  }

  function getSession() {
    return store.get(SESSION_KEY, null);
  }

  async function refreshSession(session = getSession()) {
    if (!session?.refresh_token) return { status: "signed-out" };

    const refreshed = await requestAuth("/auth/v1/token?grant_type=refresh_token", {
      refresh_token: session.refresh_token,
    });
    store.set(SESSION_KEY, refreshed);
    return { status: "refreshed", session: refreshed };
  }

  async function ensureSession() {
    const session = getSession();
    if (!session?.access_token) return null;
    if (!isSessionExpiring(session)) return session;

    const result = await refreshSession(session);
    return result.session || null;
  }

  async function completeSessionFromUrl(url = globalThis.location?.href || "") {
    const parsed = parseAuthUrl(url);
    if (parsed.error) throw new Error(parsed.error);
    if (parsed.code && !parsed.access_token) return { status: "needs-login" };
    if (!parsed.access_token) return { status: "none" };

    const user = await fetchUser(parsed.access_token);
    const now = Math.floor(Date.now() / 1000);
    const session = {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token || "",
      token_type: parsed.token_type || "bearer",
      expires_in: Number(parsed.expires_in) || 3600,
      expires_at: parsed.expires_at ? Number(parsed.expires_at) : now + (Number(parsed.expires_in) || 3600),
      user,
    };
    store.set(SESSION_KEY, session);

    return { status: "signed-in", session };
  }

  async function syncHistory() {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out", records: loadHistory(store) };

    const cloudRows = await requestRest(`/${HISTORY_TABLE}?select=*&order=created_at.desc&limit=50`, {
      method: "GET",
      session,
    });
    const cloudRecords = Array.isArray(cloudRows) ? cloudRows.map(historyRecordFromRow) : [];
    const merged = mergeHistory(store, cloudRecords);

    if (merged.length) {
      await requestRest(`/${HISTORY_TABLE}?on_conflict=id`, {
        method: "POST",
        session,
        headers: { Prefer: "resolution=merge-duplicates" },
        body: merged.map(historyRecordToRow),
      });
    }

    return { status: "synced", records: merged };
  }

  async function saveDailyAnchor(dateKey, record) {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out" };

    await requestRest(`/${DAILY_TABLE}?on_conflict=user_id,date_key`, {
      method: "POST",
      session,
      headers: { Prefer: "resolution=merge-duplicates" },
      body: [{
        date_key: dateKey,
        record_id: record.id,
        record: historyRecordToRow(record),
      }],
    });

    return { status: "synced" };
  }

  async function loadDailyAnchor(dateKey) {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out", record: null };

    const rows = await requestRest(`/${DAILY_TABLE}?select=record&date_key=eq.${encodeURIComponent(dateKey)}&limit=1`, {
      method: "GET",
      session,
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    const record = row?.record ? historyRecordFromRow(row.record) : null;

    return { status: "synced", record };
  }

  async function clearCloudRecords() {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out" };

    await requestRest(`/${HISTORY_TABLE}?id=not.is.null`, {
      method: "DELETE",
      session,
    });
    await requestRest(`/${DAILY_TABLE}?date_key=not.is.null`, {
      method: "DELETE",
      session,
    });

    return { status: "synced" };
  }

  async function requestAuth(path, body) {
    const response = await fetchImpl(baseUrl + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });
    return parseResponse(response);
  }

  async function fetchUser(accessToken) {
    const response = await fetchImpl(baseUrl + "/auth/v1/user", {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return parseResponse(response);
  }

  async function requestUserUpdate(body, accessToken) {
    const response = await fetchImpl(baseUrl + "/auth/v1/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    return parseResponse(response);
  }

  async function requestRest(path, { method, session, headers = {}, body } = {}) {
    const response = await fetchImpl(baseUrl + "/rest/v1" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parseResponse(response);
  }

  return {
    clearCloudRecords,
    completeSessionFromUrl,
    getSession,
    loadDailyAnchor,
    requestPasswordReset,
    refreshSession,
    saveDailyAnchor,
    signInWithPassword,
    signOut,
    signUpWithPassword,
    syncHistory,
    updatePassword,
  };
}

export function isSessionExpiring(session, now = Math.floor(Date.now() / 1000)) {
  if (!session?.expires_at) return false;
  return Number(session.expires_at) - now < 120;
}

export function parseAuthUrl(url) {
  const parsed = new URL(url, "http://localhost/");
  const params = new URLSearchParams(parsed.search);
  const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = new URLSearchParams(hash);
  const merged = new URLSearchParams([...params.entries(), ...hashParams.entries()]);

  return {
    access_token: merged.get("access_token") || "",
    refresh_token: merged.get("refresh_token") || "",
    expires_in: merged.get("expires_in") || "",
    expires_at: merged.get("expires_at") || "",
    token_type: merged.get("token_type") || "",
    type: merged.get("type") || "",
    code: merged.get("code") || "",
    error: merged.get("error_description") || merged.get("error") || "",
  };
}

export function normalizeSupabaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

export function historyRecordToRow(record) {
  return {
    id: record.id,
    mode: record.mode,
    title: record.title || "",
    question: record.question || "",
    answer: record.answer || "",
    action: record.action || "",
    image_src: record.imageSrc || "",
    image_alt: record.imageAlt || "",
    anchor: record.anchor || null,
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
    imageSrc: row.image_src || "",
    imageAlt: row.image_alt || "",
    anchor: row.anchor || null,
    language: row.language || "zh",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

async function parseResponse(response) {
  const parsed = await response.json().catch(() => null);
  if (response.ok) return parsed || {};

  const message = parsed?.msg || parsed?.message || parsed?.error_description || parsed?.error || "Supabase request failed";
  const error = new Error(message);
  error.status = response.status;
  error.body = parsed;
  throw error;
}
