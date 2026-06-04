import { createStorage, loadHistory, mergeHistory } from "./storage.js";
import {
  historyRecordFromRow,
  historyRecordToRow
} from "./history-store.js";

export {
  historyRecordFromRow,
  historyRecordToRow
};

export const SESSION_KEY = "askaura.authSession.v1";

const HISTORY_TABLE = "askaura_reflection_records";
const DAILY_TABLE = "askaura_daily_anchors";
const COMPANION_TABLE = "askaura_companion_profiles";
const ENTITLEMENT_TABLE = "askaura_entitlements";
const USAGE_TABLE = "askaura_usage_events";
const SHARE_LINK_FUNCTION = "/functions/v1/share-link";
const RESONANCE_FUNCTION = "/functions/v1/resonance-pool";

export function createSyncClient({
  supabaseUrl = globalThis.ASKAURA_SUPABASE_URL,
  anonKey = globalThis.ASKAURA_SUPABASE_ANON_KEY,
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

  async function loadCompanionProfile() {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out", profile: null };

    const rows = await requestRest(`/${COMPANION_TABLE}?select=profile,quiet_flags,updated_at&limit=1`, {
      method: "GET",
      session,
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    return {
      status: "synced",
      profile: row?.profile || null,
      quietFlags: Array.isArray(row?.quiet_flags) ? row.quiet_flags : [],
      updatedAt: row?.updated_at || "",
    };
  }

  async function saveCompanionProfile(profile = {}, quietFlags = []) {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out" };

    await requestRest(`/${COMPANION_TABLE}?on_conflict=user_id`, {
      method: "POST",
      session,
      headers: { Prefer: "resolution=merge-duplicates" },
      body: [{
        profile,
        quiet_flags: Array.isArray(quietFlags) ? quietFlags : [],
        updated_at: new Date().toISOString(),
      }],
    });

    return { status: "synced" };
  }

  async function loadEntitlement() {
    const session = await ensureSession();
    if (!session?.access_token) {
      return { status: "signed-out", plan: "free", entitlementStatus: "inactive" };
    }

    const rows = await requestRest(`/${ENTITLEMENT_TABLE}?select=plan,status,current_period_end,cancel_at_period_end&limit=1`, {
      method: "GET",
      session,
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    return {
      status: "synced",
      plan: row?.plan || "free",
      entitlementStatus: row?.status || "inactive",
      currentPeriodEnd: row?.current_period_end || "",
      cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    };
  }

  async function loadUsageSummary() {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out", events: [] };

    const rows = await requestRest(`/${USAGE_TABLE}?select=event_type,entry,tier,model,max_tokens,status,created_at&order=created_at.desc&limit=50`, {
      method: "GET",
      session,
    });
    return {
      status: "synced",
      events: Array.isArray(rows) ? rows.map((row) => ({
        eventType: row.event_type || "",
        entry: row.entry || "",
        tier: row.tier || "basic",
        model: row.model || "",
        maxTokens: Number(row.max_tokens) || 0,
        status: row.status || "",
        createdAt: row.created_at || "",
      })) : [],
    };
  }

  async function createShareLink(recordId, { includeQuestion = false, origin = globalThis.location?.origin || "" } = {}) {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out" };

    const result = await requestFunction(SHARE_LINK_FUNCTION, {
      method: "POST",
      session,
      headers: origin ? { "x-askaura-origin": origin } : {},
      body: {
        action: "create",
        recordId,
        includeQuestion,
      },
    });
    return { status: "created", ...result };
  }

  async function revokeShareLink(id) {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out" };

    await requestFunction(SHARE_LINK_FUNCTION, {
      method: "POST",
      session,
      body: {
        action: "revoke",
        id,
      },
    });
    return { status: "revoked" };
  }

  async function loadShareLink(token) {
    const result = await requestFunction(SHARE_LINK_FUNCTION, {
      method: "POST",
      body: {
        action: "get",
        token,
      },
    });
    return { status: "loaded", ...result };
  }

  async function submitResonance(recordId) {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out" };

    const result = await requestFunction(RESONANCE_FUNCTION, {
      method: "POST",
      session,
      body: {
        action: "submit",
        recordId,
      },
    });
    return { status: "submitted", ...result };
  }

  async function revokeResonance(id) {
    const session = await ensureSession();
    if (!session?.access_token) return { status: "signed-out" };

    const result = await requestFunction(RESONANCE_FUNCTION, {
      method: "POST",
      session,
      body: {
        action: "revoke",
        id,
      },
    });
    return { status: "revoked", ...result };
  }

  async function loadResonancePool({ language = "zh", category = "all" } = {}) {
    const result = await requestFunction(RESONANCE_FUNCTION, {
      method: "POST",
      body: {
        action: "list",
        language,
        category,
      },
    });
    return { status: "loaded", ...result };
  }

  async function reactToResonance(id, reaction) {
    const result = await requestFunction(RESONANCE_FUNCTION, {
      method: "POST",
      body: {
        action: "react",
        id,
        reaction,
      },
    });
    return { status: "reacted", ...result };
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

  async function requestFunction(path, { method, session, headers = {}, body } = {}) {
    const response = await fetchImpl(baseUrl + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session?.access_token || anonKey}`,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parseResponse(response);
  }

  return {
    clearCloudRecords,
    completeSessionFromUrl,
    createShareLink,
    getSession,
    loadCompanionProfile,
    loadDailyAnchor,
    loadEntitlement,
    loadResonancePool,
    loadShareLink,
    loadUsageSummary,
    requestPasswordReset,
    refreshSession,
    reactToResonance,
    revokeShareLink,
    revokeResonance,
    saveDailyAnchor,
    saveCompanionProfile,
    signInWithPassword,
    signOut,
    signUpWithPassword,
    submitResonance,
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

async function parseResponse(response) {
  const parsed = await response.json().catch(() => null);
  if (response.ok) return parsed || {};

  const message = parsed?.msg || parsed?.message || parsed?.error_description || parsed?.error || "Supabase request failed";
  const error = new Error(message);
  error.status = response.status;
  error.body = parsed;
  throw error;
}
