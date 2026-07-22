import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const flags = await readFile("assets/app/feature-flags.js", "utf8");
const html = await readFile("index.html", "utf8");
const main = await readFile("assets/app/main.js", "utf8");
const nodeVersion = (await readFile(".node-version", "utf8")).trim();

assert.equal(nodeVersion, "24");
assert.match(flags, /systemConvergenceV1/);
assert.match(flags, /askaura\.systemConvergenceV1/);
assert.match(html, /assets\/app\/main\.js/);
assert.match(main, /feature-flags\.js/);
console.log("system convergence release flag contract passed");
