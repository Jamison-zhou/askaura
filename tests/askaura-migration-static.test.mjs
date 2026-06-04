import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const activeFiles = [
  "index.html",
  "admin.html",
  "_headers",
  "assets/app/config.js",
  "assets/app/storage.js",
  "assets/app/sync.js",
  "supabase/config.toml",
  "supabase/functions/_shared/cors.ts",
  "supabase/functions/_shared/runtime-config.ts",
  "supabase/functions/admin-config/index.ts",
  "supabase/functions/tarot-draw/index.ts",
  "supabase/functions/reading/index.ts",
];

for (const file of activeFiles) {
  const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  let boundaryText = text;

  if (file === "assets/app/config.js") {
    const legacyRefDeclaration = 'const LEGACY_SUPABASE_PROJECT_REF = "icvegpfnpkyrebtojoca";';
    const declarationMatches = text.match(/const LEGACY_SUPABASE_PROJECT_REF = "icvegpfnpkyrebtojoca";/g) || [];
    const guardMatches = text.match(/includes\(LEGACY_SUPABASE_PROJECT_REF\)/g) || [];
    const variableMentions = text.match(/\bLEGACY_SUPABASE_PROJECT_REF\b/g) || [];

    assert.equal(declarationMatches.length, 1, `${file} must declare the old ref sentinel exactly once`);
    assert.ok(guardMatches.length <= 1, `${file} may only use the old ref sentinel in one includes() rejection check`);
    assert.equal(
      variableMentions.length,
      declarationMatches.length + guardMatches.length,
      `${file} must not reference LEGACY_SUPABASE_PROJECT_REF outside the sentinel declaration and includes() rejection check`,
    );

    boundaryText = text
      .replace(legacyRefDeclaration, "")
      .replace(/includes\(LEGACY_SUPABASE_PROJECT_REF\)/g, "");

    assert.equal(
      /\bLEGACY_SUPABASE_PROJECT_REF\b/.test(boundaryText),
      false,
      `${file} must not reference LEGACY_SUPABASE_PROJECT_REF outside the sentinel declaration and includes() rejection check`,
    );
  }

  assert.equal(boundaryText.includes("icvegpfnpkyrebtojoca"), false, `${file} must not target old cijing Supabase`);
  assert.equal(
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]/.test(boundaryText),
    false,
    `${file} must not contain service role key assignments`,
  );
  assert.equal(
    /service[_-]?role/i.test(boundaryText)
      && /(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9_-]+)/.test(boundaryText),
    false,
    `${file} must not contain service role secret values`,
  );
  assert.equal(
    /(sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.test(boundaryText),
    false,
    `${file} may contain a real secret value`,
  );
  assert.equal(boundaryText.includes("rill_reflection_records"), false, `${file} must not write old history table`);
  assert.equal(boundaryText.includes("rill_daily_anchors"), false, `${file} must not write old daily table`);
  assert.equal(boundaryText.includes("rill_runtime_config"), false, `${file} must not read old runtime config table`);
}

const runtimeMigration = readFileSync(
  new URL("../supabase/migrations/202606030001_askaura_runtime_config.sql", import.meta.url),
  "utf8",
);
const reflectionMigration = readFileSync(
  new URL("../supabase/migrations/202606030002_askaura_user_reflections.sql", import.meta.url),
  "utf8",
);
const followupMigration = readFileSync(
  new URL("../supabase/migrations/202606030003_askaura_followups.sql", import.meta.url),
  "utf8",
);
const clarificationMigration = readFileSync(
  new URL("../supabase/migrations/202606030004_askaura_clarification_links.sql", import.meta.url),
  "utf8",
);
const actionStatusMigration = readFileSync(
  new URL("../supabase/migrations/202606030005_askaura_action_status.sql", import.meta.url),
  "utf8",
);
const reviewMigration = readFileSync(
  new URL("../supabase/migrations/202606030006_askaura_review_metadata.sql", import.meta.url),
  "utf8",
);
const favoriteMigration = readFileSync(
  new URL("../supabase/migrations/202606030007_askaura_history_favorites.sql", import.meta.url),
  "utf8",
);
const spreadMigration = readFileSync(
  new URL("../supabase/migrations/202606030008_askaura_spread_cards.sql", import.meta.url),
  "utf8",
);
const migrations = `${runtimeMigration}\n${reflectionMigration}\n${followupMigration}\n${clarificationMigration}\n${actionStatusMigration}\n${reviewMigration}\n${favoriteMigration}\n${spreadMigration}`;

assert.ok(runtimeMigration.includes("askaura_runtime_config"));
assert.ok(reflectionMigration.includes("askaura_reflection_records"));
assert.ok(reflectionMigration.includes("askaura_daily_anchors"));
assert.ok(reflectionMigration.includes("id text primary key"));
assert.ok(reflectionMigration.includes("mode in ('tarot', 'meihua', 'dual', 'daily')"));
assert.ok(reflectionMigration.includes("primary key (user_id, date_key)"));
assert.ok(reflectionMigration.includes("alter table public.askaura_reflection_records enable row level security"));
assert.ok(reflectionMigration.includes("alter table public.askaura_daily_anchors enable row level security"));
assert.ok(followupMigration.includes("add column if not exists followups jsonb"));
assert.ok(clarificationMigration.includes("add column if not exists clarification_of jsonb"));
assert.ok(actionStatusMigration.includes("add column if not exists action_status text"));
assert.ok(actionStatusMigration.includes("'done', 'not_done', 'skipped', 'not_fit'"));
assert.ok(reviewMigration.includes("add column if not exists review_at timestamptz"));
assert.ok(reviewMigration.includes("add column if not exists review_note text"));
assert.ok(favoriteMigration.includes("add column if not exists is_favorite boolean"));
assert.ok(spreadMigration.includes("add column if not exists spread_type text"));
assert.ok(spreadMigration.includes("add column if not exists cards jsonb"));
assert.ok(spreadMigration.includes("add column if not exists gua jsonb"));
assert.equal(migrations.includes("drop table"), false);
assert.equal(migrations.includes("alter table public.rill_"), false);
assert.equal(migrations.includes("public.rill_"), false);

const reading = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");
assert.ok(reading.includes("X-AskAura-Provider"));
assert.ok(reading.includes("X-AskAura-Model"));
assert.equal(reading.includes("X-Rill-"), false);

const promptStyle = readFileSync(new URL("../supabase/functions/_shared/prompts/style.ts", import.meta.url), "utf8");
assert.ok(promptStyle.includes("AskAura"));
assert.ok(promptStyle.includes("象问"));
assert.equal(promptStyle.includes("RiLL"), false);

const docs = [
  readFileSync(new URL("../README.md", import.meta.url), "utf8"),
  readFileSync(new URL("../DEPLOY.md", import.meta.url), "utf8"),
  readFileSync(new URL("../supabase/README.md", import.meta.url), "utf8"),
];
for (const doc of docs) {
  assert.match(doc, /reading/);
  assert.match(doc, /tarot-draw/);
  assert.match(doc, /admin-config/);
  assert.match(doc, /share-link/);
  assert.match(doc, /resonance-pool/);
}

console.log("askaura migration static tests passed");
