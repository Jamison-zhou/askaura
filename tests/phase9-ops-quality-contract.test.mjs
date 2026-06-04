import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/202606030013_askaura_quality_events.sql");
assert.match(migration, /create table if not exists public\.askaura_quality_events/, "quality events table exists");
assert.match(migration, /prompt_version text not null/, "quality events store prompt version");
assert.match(migration, /mode text not null/, "quality events store route mode");
assert.match(migration, /entry text not null/, "quality events store route entry");
assert.match(migration, /tier text not null/, "quality events store route tier");
assert.match(migration, /provider text not null/, "quality events store provider");
assert.match(migration, /model text not null/, "quality events store model");
assert.match(migration, /thinking text not null/, "quality events store thinking mode");
assert.match(migration, /token_ok boolean not null/, "quality events store token status");
assert.match(migration, /missing_tokens text\[\]/, "quality events store missing token names only");
assert.match(migration, /safety_flags text\[\]/, "quality events store safety flags only");
assert.match(migration, /output_chars integer not null/, "quality events store output length only");
assert.match(migration, /latency_ms integer not null/, "quality events store latency only");
assert.doesNotMatch(migration, /\b(question|answer|full_text|fulltext|followup_question)\b/i, "quality schema has no raw private text columns");
assert.match(migration, /enable row level security/, "quality events enable RLS");
assert.match(migration, /for select\s+using \(false\)/i, "direct quality selects are blocked");
assert.match(migration, /for insert\s+with check \(false\)/i, "direct quality inserts are blocked");
assert.match(migration, /for update\s+using \(false\)/i, "direct quality updates are blocked");
assert.match(migration, /for delete\s+using \(false\)/i, "direct quality deletes are blocked");

assert.ok(existsSync(new URL("../supabase/functions/_shared/quality.ts", import.meta.url)), "quality helper exists");
const quality = read("supabase/functions/_shared/quality.ts");
assert.match(quality, /scanContentSafety/, "quality helper exports safety scanner");
assert.match(quality, /recordQualityEvent/, "quality helper exports quality event writer");
assert.match(quality, /askaura_quality_events/, "quality helper writes the quality table");
assert.doesNotMatch(quality, /\bquestion\b|\banswer\b|fullText|followupQuestion/i, "quality helper does not accept raw private text fields");

const qualityUrl = pathToFileURL(resolve("supabase/functions/_shared/quality.ts")).href;
const scanJson = execFileSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--input-type=module",
    "-e",
    `
      import { scanContentSafety } from ${JSON.stringify(qualityUrl)};
      console.log(JSON.stringify({
        deterministic: scanContentSafety("This is guaranteed and will definitely happen."),
        clean: scanContentSafety("Notice what is present and choose one small action today.")
      }));
    `,
  ],
  { encoding: "utf8" },
);
const scan = JSON.parse(scanJson);
assert.ok(scan.deterministic.includes("deterministic_future"), "scanner flags deterministic future claims");
assert.deepEqual(scan.clean, [], "scanner leaves ordinary reflective text unflagged");

const runtimeConfig = read("supabase/functions/_shared/runtime-config.ts");
assert.match(runtimeConfig, /ops\?:/, "runtime config has ops section");
assert.match(runtimeConfig, /promptVersion: "askaura-2026-06-03"/, "default prompt version is configured");
assert.match(runtimeConfig, /qualityLoggingEnabled: true/, "quality logging defaults on");
assert.match(runtimeConfig, /contentSafetyScanEnabled: true/, "content safety scan defaults on");
assert.match(runtimeConfig, /experimentKey: ""/, "experiment key is reserved but empty");
assert.match(runtimeConfig, /rollbackNote: ""/, "rollback note is available");

const adminConfig = read("supabase/functions/admin-config/index.ts");
assert.match(adminConfig, /ops\.promptVersion/, "admin config sanitizes prompt version");
assert.match(adminConfig, /qualityLoggingEnabled/, "admin config sanitizes quality logging switch");
assert.match(adminConfig, /contentSafetyScanEnabled/, "admin config sanitizes safety scan switch");
assert.match(adminConfig, /rollbackNote/, "admin config sanitizes rollback note");

const adminHtml = read("admin.html");
assert.match(adminHtml, /Ops Quality/, "admin page exposes ops panel");
assert.match(adminHtml, /name="ops\.promptVersion"/, "admin page exposes prompt version");
assert.match(adminHtml, /name="ops\.qualityLoggingEnabled"/, "admin page exposes quality logging switch");
assert.match(adminHtml, /name="ops\.contentSafetyScanEnabled"/, "admin page exposes safety scan switch");
assert.match(adminHtml, /name="ops\.rollbackNote"/, "admin page exposes rollback note");

const reading = read("supabase/functions/reading/index.ts");
assert.match(reading, /recordQualityEvent/, "reading records quality metadata");
assert.match(reading, /scanContentSafety\(fullText\)/, "reading scans generated output in memory");
assert.match(reading, /opsConfig\.promptVersion/, "reading uses server-owned prompt version");
assert.match(reading, /opsConfig\.qualityLoggingEnabled !== false/, "reading obeys quality logging kill switch");
assert.match(reading, /opsConfig\.contentSafetyScanEnabled === false/, "reading obeys safety scan kill switch");
assert.match(reading, /outputChars: fullText\.length/, "reading records output length only");
assert.doesNotMatch(reading, /recordQualityEvent\([\s\S]*?(question|answer|followupQuestion|originalQuestion|resultSummary):/i, "quality event does not include raw request text");

const sync = read("assets/app/sync.js");
assert.doesNotMatch(sync, /askaura_quality_events/, "browser sync does not directly access quality events");

console.log("phase9 ops quality contract passed");
