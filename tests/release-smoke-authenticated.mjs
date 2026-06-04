import { pathToFileURL } from "node:url";

const REQUIRED_ENV = [
  "ASKAURA_SMOKE_SUPABASE_URL",
  "ASKAURA_SMOKE_ANON_KEY",
  "ASKAURA_SMOKE_USER_EMAIL",
  "ASKAURA_SMOKE_USER_PASSWORD",
  "ASKAURA_SMOKE_ADMIN_USERNAME",
  "ASKAURA_SMOKE_ADMIN_PASSWORD",
];

const MAX_ERROR_SNIPPET = 240;
const SENSITIVE_RAW_KEY =
  /"?[A-Za-z0-9_-]*(?:access[_-]?token|refresh[_-]?token|token|password|secret|authorization|api[_-]?key|service[_-]?role[_-]?key)[A-Za-z0-9_-]*"?/gi;
const SENSITIVE_RAW = new RegExp(`(${SENSITIVE_RAW_KEY.source}\\s*[:=]\\s*)(".*?"|[^,\\s}]+)`, "gi");

export function requireSmokeEnv(env = process.env) {
  const values = {};
  for (const key of REQUIRED_ENV) {
    const value = String(env?.[key] || "").trim();
    if (!value) {
      throw new Error(`Missing required smoke env: ${key}`);
    }
    values[key] = value;
  }
  return values;
}

export function redact(value) {
  const text = String(value ?? "");
  if (!text) return "";
  if (text.length <= 8) return "********";
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function capText(value, max = MAX_ERROR_SNIPPET) {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function redactJsonValue(value, key = "") {
  if (isSensitiveKey(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((item) => redactJsonValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactJsonValue(entryValue, entryKey)]),
    );
  }
  if (typeof value === "string") return capText(value, 120);
  return value;
}

function redactRawText(value) {
  const sanitized = capText(value, MAX_ERROR_SNIPPET * 2)
    .replace(SENSITIVE_RAW, '$1"[redacted]"');
  const configIndex = sanitized.toLowerCase().indexOf('"config"');
  if (configIndex >= 0) {
    return capText(`${sanitized.slice(0, configIndex)}"config":"[redacted]"`, MAX_ERROR_SNIPPET);
  }
  return capText(sanitized);
}

function isSensitiveKey(key) {
  const normalized = String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("accesstoken") ||
    normalized.includes("refreshtoken") ||
    normalized.includes("token") ||
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.includes("authorization") ||
    normalized.includes("apikey") ||
    normalized.includes("servicerolekey") ||
    normalized === "config"
  );
}

function formatResultBody(result) {
  if (result?.body !== undefined) {
    return capText(JSON.stringify(redactJsonValue(result.body)));
  }
  if (result?.rawText) {
    return redactRawText(result.rawText);
  }
  return "";
}

function ensureError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

function fail(message, result) {
  const detail = formatResultBody(result);
  throw new Error(detail ? `${message} ${detail}` : message);
}

export function assertOk(result, label) {
  if (result && result.status >= 200 && result.status < 300) return;
  fail(`${label} failed: ${result?.status ?? "unknown"}`, result);
}

async function jsonFetch(fetchImpl, url, { method = "POST", headers = {}, body, expectJson = true } = {}) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const rawText = await response.text();
  if (!expectJson) {
    return { status: response.status, body: undefined, headers: response.headers, rawText };
  }
  if (!rawText.trim()) {
    return { status: response.status, body: undefined, headers: response.headers, rawText, parseError: "empty JSON body" };
  }
  try {
    return {
      status: response.status,
      body: JSON.parse(rawText),
      headers: response.headers,
      rawText,
    };
  } catch {
    return {
      status: response.status,
      body: undefined,
      headers: response.headers,
      rawText,
      parseError: "invalid JSON body",
    };
  }
}

function assertValidJson(result, label) {
  if (!result?.parseError) return;
  fail(`${label} returned ${result.parseError}`, result);
}

function expectObject(result, label) {
  assertValidJson(result, label);
  if (!result?.body || typeof result.body !== "object" || Array.isArray(result.body)) {
    fail(`${label} did not return an object`, result);
  }
  return result.body;
}

function expectArray(result, label) {
  assertValidJson(result, label);
  if (!Array.isArray(result?.body)) {
    fail(`${label} did not return an array`, result);
  }
  return result.body;
}

function expectString(value, label, result) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} did not return ${label.split(" ").slice(-1)[0]}`, result);
  }
  return value.trim();
}

function expectOkResponse(result, label) {
  const body = expectObject(result, label);
  if (body.ok !== true) {
    fail(`${label} did not return ok=true`, result);
  }
}

async function cleanupStep(label, task, errors) {
  try {
    await task();
  } catch (error) {
    errors.push(`${label}: ${ensureError(error).message}`);
  }
}

async function deleteRecordAndVerify(fetchImpl, restUrl, anonKey, accessToken, recordId) {
  const deleteRecord = await jsonFetch(
    fetchImpl,
    `${restUrl}/askaura_reflection_records?id=eq.${encodeURIComponent(recordId)}`,
    {
      method: "DELETE",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      expectJson: false,
    },
  );
  assertOk(deleteRecord, "history delete");

  const verifyRead = await jsonFetch(
    fetchImpl,
    `${restUrl}/askaura_reflection_records?select=id&id=eq.${encodeURIComponent(recordId)}&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  assertOk(verifyRead, "history verify delete");
  const rows = expectArray(verifyRead, "history verify delete");
  if (rows.length !== 0) {
    fail("history delete did not remove the inserted record", verifyRead);
  }
}

export async function runAuthenticatedSmoke({ env = process.env, fetchImpl = fetch } = {}) {
  const smokeEnv = requireSmokeEnv(env);
  const baseUrl = smokeEnv.ASKAURA_SMOKE_SUPABASE_URL.replace(/\/+$/, "");
  const restUrl = `${baseUrl}/rest/v1`;
  const authUrl = `${baseUrl}/auth/v1`;
  const functionUrl = `${baseUrl}/functions/v1`;
  const anonKey = smokeEnv.ASKAURA_SMOKE_ANON_KEY;

  let accessToken = "";
  let recordId = "";
  let shareId = "";
  let submissionId = "";
  let mainError = null;
  const cleanupErrors = [];

  console.log(`Smoke target: ${baseUrl}`);
  console.log(`Anon key: ${redact(anonKey)}`);

  try {
    const adminLogin = await jsonFetch(fetchImpl, `${functionUrl}/admin-config`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: {
        action: "login",
        username: smokeEnv.ASKAURA_SMOKE_ADMIN_USERNAME,
        password: smokeEnv.ASKAURA_SMOKE_ADMIN_PASSWORD,
      },
    });
    assertOk(adminLogin, "admin login");
    const adminLoginBody = expectObject(adminLogin, "admin login");
    const adminToken = expectString(adminLoginBody.token, "admin login token", adminLogin);

    const adminGet = await jsonFetch(fetchImpl, `${functionUrl}/admin-config`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${adminToken}`,
      },
      body: { action: "get" },
    });
    assertOk(adminGet, "admin config get");
    const adminGetBody = expectObject(adminGet, "admin config get");
    if (!adminGetBody.config || typeof adminGetBody.config !== "object" || Array.isArray(adminGetBody.config)) {
      fail("admin config get did not return config", adminGet);
    }

    const signIn = await jsonFetch(fetchImpl, `${authUrl}/token?grant_type=password`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: {
        email: smokeEnv.ASKAURA_SMOKE_USER_EMAIL,
        password: smokeEnv.ASKAURA_SMOKE_USER_PASSWORD,
      },
    });
    assertOk(signIn, "user sign in");
    const signInBody = expectObject(signIn, "user sign in");
    accessToken = expectString(signInBody.access_token, "user sign in access_token", signIn);

    recordId = `release-smoke-${Date.now()}`;
    const record = {
      id: recordId,
      mode: "daily",
      title: "Release smoke",
      question: "What should I verify?",
      answer: "Smoke theme and action stay simple.",
      action: "Write one concrete note today.",
      image_src: "",
      image_alt: "",
      language: "zh",
    };

    const insertRecord = await jsonFetch(fetchImpl, `${restUrl}/askaura_reflection_records`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: [record],
    });
    assertOk(insertRecord, "history insert");
    const insertedRows = expectArray(insertRecord, "history insert");
    if (!insertedRows.some((row) => row && typeof row === "object" && row.id === recordId)) {
      fail("history insert did not return the inserted record", insertRecord);
    }

    const readRecord = await jsonFetch(
      fetchImpl,
      `${restUrl}/askaura_reflection_records?select=*&id=eq.${encodeURIComponent(recordId)}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assertOk(readRecord, "history read");
    const readRows = expectArray(readRecord, "history read");
    if (readRows.length !== 1 || readRows[0]?.id !== recordId) {
      fail("history read did not return exactly the inserted record", readRecord);
    }

    const shareCreate = await jsonFetch(fetchImpl, `${functionUrl}/share-link`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "x-askaura-origin": baseUrl,
      },
      body: {
        action: "create",
        recordId,
        includeQuestion: false,
      },
    });
    assertOk(shareCreate, "share link create");
    const shareCreateBody = expectObject(shareCreate, "share link create");
    shareId = expectString(shareCreateBody.id, "share link create id", shareCreate);
    const shareUrl = expectString(shareCreateBody.url, "share link create url", shareCreate);
    if (!shareUrl.includes("share=")) {
      fail("share link create did not return a share url", shareCreate);
    }

    const resonanceSubmit = await jsonFetch(fetchImpl, `${functionUrl}/resonance-pool`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        action: "submit",
        recordId,
      },
    });
    assertOk(resonanceSubmit, "resonance submit");
    const resonanceBody = expectObject(resonanceSubmit, "resonance submit");
    const submission = resonanceBody.submission;
    if (!submission || typeof submission !== "object" || Array.isArray(submission)) {
      fail("resonance submit did not return submission", resonanceSubmit);
    }
    submissionId = expectString(submission.id, "resonance submit submission id", resonanceSubmit);
  } catch (error) {
    mainError = ensureError(error);
  } finally {
    if (accessToken && shareId) {
      await cleanupStep("share link revoke", async () => {
        const shareRevoke = await jsonFetch(fetchImpl, `${functionUrl}/share-link`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            action: "revoke",
            id: shareId,
          },
        });
        assertOk(shareRevoke, "share link revoke");
        expectOkResponse(shareRevoke, "share link revoke");
      }, cleanupErrors);
    }

    if (accessToken && submissionId) {
      await cleanupStep("resonance revoke", async () => {
        const resonanceRevoke = await jsonFetch(fetchImpl, `${functionUrl}/resonance-pool`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            action: "revoke",
            id: submissionId,
          },
        });
        assertOk(resonanceRevoke, "resonance revoke");
        expectOkResponse(resonanceRevoke, "resonance revoke");
      }, cleanupErrors);
    }

    if (accessToken && recordId) {
      await cleanupStep("history delete", async () => {
        await deleteRecordAndVerify(fetchImpl, restUrl, anonKey, accessToken, recordId);
      }, cleanupErrors);
    }
  }

  if (mainError) {
    if (cleanupErrors.length) {
      mainError.message = `${mainError.message}\nCleanup failures:\n- ${cleanupErrors.join("\n- ")}`;
    }
    throw mainError;
  }

  if (cleanupErrors.length) {
    throw new Error(`Cleanup failures:\n- ${cleanupErrors.join("\n- ")}`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runAuthenticatedSmoke()
    .then(() => {
      console.log("authenticated release smoke passed");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
