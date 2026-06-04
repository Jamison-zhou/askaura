import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const plan = readFileSync(new URL("../docs/ask-aura-implementation-plans/06-phase-5-sharing-export.md", import.meta.url), "utf8");
const shareModule = html.slice(html.indexOf("function shareSymbolLabel"), html.indexOf("function followupQuestionText"));

assert.match(html, /id="copy-summary-btn"/, "result actions expose summary copy");
assert.match(html, /id="copy-full-btn"/, "result actions expose full-result copy");
assert.match(html, /id="share-image-btn"/, "result actions expose local share image export");
assert.match(html, /id="export-pdf-btn"/, "result actions expose PDF export");
assert.match(html, /id="share-include-question"/, "question inclusion is an explicit opt-in");

assert.match(html, /shareResultData\(\{ includeQuestion = false \} = \{\}\)/, "share payload excludes question by default");
assert.match(html, /const question = includeQuestion \? cleanText\(record\.question \|\| lastQuestion, ""\) : ""/, "original question is only included after opt-in");
assert.match(html, /const report = reportFromRecord\(record\) \|\| \{\};[\s\S]*const summary = cleanTaggedOutputText\(/, "share payload strips leaked protocol tags from summary fields");
assert.match(html, /const action = cleanTaggedOutputText\(/, "share payload strips leaked protocol tags from action fields");
assert.doesNotMatch(shareModule, /user\.email|access_token|refresh_token|service_role/i, "share output does not reference account tokens or email");
assert.match(html, /fullShareLines\(data\)/, "full copy uses a sanitized line builder");
assert.match(html, /reviewNote \? `\$\{lang === "zh" \? "复盘" : "Review"\}: \$\{data\.reviewNote\}`/, "PDF/full export can include review note");

assert.match(html, /new Blob\(\[svg\], \{ type: "image\/svg\+xml;charset=utf-8" \}\)/, "share image is generated locally");
assert.match(html, /link\.download = `askaura-share-\$\{Date\.now\(\)\}\.svg`/, "share image downloads as a local file");
assert.match(html, /page\.document\.write\(`<!doctype html>/, "PDF export opens a print document");
assert.match(html, /<script>print\(\);<\\\/script>/, "PDF export invokes browser print");

assert.match(css, /\.share-panel/, "share panel has explicit styling");
assert.match(css, /\.copy-fallback/, "manual copy fallback is visible when needed");

assert.match(plan, /Private links require login/, "private-link task remains tracked in the implementation plan");

console.log("phase5 sharing export contract passed");
