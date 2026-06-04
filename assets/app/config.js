const LEGACY_SUPABASE_PROJECT_REF = "icvegpfnpkyrebtojoca";

export function normalizeSupabaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function getAskAuraConfig(source = globalThis) {
  const supabaseUrl = normalizeSupabaseUrl(source?.ASKAURA_SUPABASE_URL);
  const anonKey = String(source?.ASKAURA_SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl) {
    throw new Error("Missing ASKAURA_SUPABASE_URL");
  }

  if (supabaseUrl.includes(LEGACY_SUPABASE_PROJECT_REF)) {
    throw new Error("ASKAURA_SUPABASE_URL points to the old cijing Supabase project");
  }

  if (!anonKey) {
    throw new Error("Missing ASKAURA_SUPABASE_ANON_KEY");
  }

  return { supabaseUrl, anonKey };
}
