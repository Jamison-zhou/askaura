import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);

assert.ok(match, "index module script exists");
new vm.SourceTextModule(match[1]);

console.log("index module syntax passed");
