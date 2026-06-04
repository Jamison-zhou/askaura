import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const headers = readFileSync(new URL("../_headers", import.meta.url), "utf8");

assert.match(headers, /X-Content-Type-Options:\s+nosniff/);
assert.match(headers, /Referrer-Policy:\s+strict-origin-when-cross-origin/);
assert.match(
  headers,
  /Permissions-Policy:\s+camera=\(\),\s+microphone=\(\),\s+geolocation=\(\)/
);
assert.match(headers, /frame-ancestors\s+'none'/);
assert.match(
  headers,
  /connect-src\s+'self'\s+https:\/\/oeqekrlodqxjlakdjqpu\.supabase\.co/
);
assert.doesNotMatch(headers, /icvegpfnpkyrebtojoca/);

const expectedCsp =
  "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://oeqekrlodqxjlakdjqpu.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

assert.match(headers, new RegExp(expectedCsp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

console.log("security headers tests passed");
