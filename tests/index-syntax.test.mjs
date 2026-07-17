import assert from "node:assert/strict";
import vm from "node:vm";
import { appDom, appHtml, appI18n, appModule } from "./helpers/app-source.mjs";

assert.match(appHtml, /<script type="module" src="\.\/assets\/app\/main\.js"><\/script>/, "external app module exists");
new vm.SourceTextModule(appModule);
new vm.SourceTextModule(appDom);
new vm.SourceTextModule(appI18n);

console.log("index module syntax passed");
