import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { DenoEnv } from "../_shared/llm.ts";

function serviceHeaders(key: string): HeadersInit {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function authenticatedUser(baseUrl: string, anonKey: string, authorization: string | null) {
  const bearer = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return typeof user?.id === "string" ? user : null;
}

Deno.serve(async (request: Request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action !== "delete-account") return jsonResponse({ error: "Unknown action" }, 400);

    const env = new DenoEnv();
    const baseUrl = env.require("SUPABASE_URL").replace(/\/+$/, "");
    const anonKey = env.require("SUPABASE_ANON_KEY");
    const serviceRoleKey = env.require("SUPABASE_SERVICE_ROLE_KEY");
    const user = await authenticatedUser(baseUrl, anonKey, request.headers.get("Authorization"));
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const response = await fetch(`${baseUrl}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: "DELETE",
      headers: serviceHeaders(serviceRoleKey),
    });
    if (!response.ok) throw new Error(await response.text());
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Account deletion failed" }, 500);
  }
});
