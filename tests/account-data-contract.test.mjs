import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../supabase/functions/account-data/index.ts", import.meta.url), "utf8");
assert.match(source, /body\?\.action !== "delete-account"/);
assert.match(source, /request\.headers\.get\("Authorization"\)/);
assert.match(source, /auth\/v1\/user/);
assert.match(source, /auth\/v1\/admin\/users\/\$\{encodeURIComponent\(user\.id\)\}/);
assert.match(source, /Unauthorized" \}, 401/);
assert.doesNotMatch(source, /body\.(userId|user_id)|body\?\.(userId|user_id)/, "browser cannot select the account id to delete");

console.log("account data contract passed");
