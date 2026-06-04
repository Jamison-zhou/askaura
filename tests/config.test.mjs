import assert from "node:assert/strict";
import {
  getAskAuraConfig,
  normalizeSupabaseUrl,
} from "../assets/app/config.js";

assert.equal(
  normalizeSupabaseUrl("https://oeqekrlodqxjlakdjqpu.supabase.co/"),
  "https://oeqekrlodqxjlakdjqpu.supabase.co"
);

assert.deepEqual(getAskAuraConfig({
  ASKAURA_SUPABASE_URL: "https://oeqekrlodqxjlakdjqpu.supabase.co/",
  ASKAURA_SUPABASE_ANON_KEY: "  sb_publishable_example  ",
}), {
  supabaseUrl: "https://oeqekrlodqxjlakdjqpu.supabase.co",
  anonKey: "sb_publishable_example",
});

assert.throws(
  () => getAskAuraConfig({
    ASKAURA_SUPABASE_URL: "https://oeqekrlodqxjlakdjqpu.supabase.co",
    ASKAURA_SUPABASE_ANON_KEY: "",
  }),
  /Missing ASKAURA_SUPABASE_ANON_KEY/
);

assert.throws(
  () => getAskAuraConfig({
    ASKAURA_SUPABASE_URL: "https://oeqekrlodqxjlakdjqpu.supabase.co",
    ASKAURA_SUPABASE_ANON_KEY: "   ",
  }),
  /Missing ASKAURA_SUPABASE_ANON_KEY/
);

assert.throws(
  () => getAskAuraConfig({ ASKAURA_SUPABASE_URL: "https://icvegpfnpkyrebtojoca.supabase.co", ASKAURA_SUPABASE_ANON_KEY: "x" }),
  /old cijing Supabase project/
);

assert.throws(
  () => getAskAuraConfig({ ASKAURA_SUPABASE_URL: "", ASKAURA_SUPABASE_ANON_KEY: "x" }),
  /Missing ASKAURA_SUPABASE_URL/
);

console.log("config tests passed");
