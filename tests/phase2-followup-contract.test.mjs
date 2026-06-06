import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const reading = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");
const validator = readFileSync(new URL("../supabase/functions/_shared/token-validator.ts", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../supabase/functions/_shared/prompts/followup.ts", import.meta.url), "utf8");
const router = readFileSync(new URL("../supabase/functions/_shared/model-router.ts", import.meta.url), "utf8");
const followupModule = readFileSync(new URL("../assets/app/followup.js", import.meta.url), "utf8");

assert.match(types, /mode:\s*"followup"/, "followup request mode is typed");
assert.match(types, /originalQuestion:\s*string/, "followup carries original question");
assert.match(types, /resultSummary:\s*string/, "followup carries compact result summary");
assert.match(types, /followupQuestion:\s*string/, "followup carries user follow-up question");
assert.match(reading, /buildFollowupPrompt/, "reading function routes followup prompt");
assert.match(reading, /o\.mode === "followup"/, "reading validator accepts followup mode");
assert.match(reading, /typeof o\.originalQuestion === "string"/, "reading validator requires original question");
assert.match(validator, /followup:\s*\[\]/, "followup has no required output tokens");
assert.match(router, /req\.mode === "followup"\) return "followup"/, "followup mode defaults to followup route entry");

assert.match(html, /async function showFollowupAnswer/, "front-end followup answer is async");
assert.match(html, /mode:\s*"followup"[\s\S]*tier:\s*"basic"[\s\S]*entry:\s*"followup"/, "front-end submits ordinary followups to the reading followup mode");
assert.match(html, /originalQuestion:\s*lastQuestion \|\| t\("fallbackQuestion"\)/, "front-end sends original question context");
assert.match(html, /resultSummary:\s*followupResultSummary\(\)/, "front-end sends compact result summary");
assert.match(html, /followupQuestion:\s*question/, "front-end sends the selected followup question");
assert.match(html, /els\.followupAnswerText\.textContent = cleanTaggedOutputText\(text, ""\);/, "followup streaming strips leaked protocol tags");
assert.match(html, /els\.followupAnswerText\.textContent = cleanTaggedOutputText\(answer, t\("followupFailed"\)\);/, "followup final display strips leaked protocol tags");
assert.match(html, /catch \(error\) \{[\s\S]*els\.followupAnswerText\.textContent = t\("followupFailed"\);/, "front-end keeps result visible and shows inline followup failure");
assert.match(followupModule, /"clarify-card": labels\.clarifyCard/, "clarification follow-up has a localized inline question");
assert.match(html, /clarifyCard: t\("followupClarifyCard"\)/, "front-end passes clarification label to follow-up selection");
assert.match(html, /function renderStoredFollowups/, "history view can restore stored followups");
assert.match(html, /renderClarificationLink\(record\.clarificationOf\)/, "history view can restore clarification links");
assert.match(html, /id="question-examples"/, "front-end renders good question examples near the input");
assert.equal((html.match(/data-question-example/g) || []).length, 5, "front-end has four example buttons plus one event selector");
assert.match(html, /questionExample1:/, "question examples are localized");
const exampleClick = html.match(/els\.questionExamples\.addEventListener\("click",\s*\(event\) => \{([\s\S]*?)\n\s*}\);/);
assert.ok(exampleClick, "question example click listener exists");
assert.match(exampleClick[1], /els\.input\.value = button\.textContent\.trim\(\);/, "question example click fills the input");
assert.doesNotMatch(exampleClick[1], /requestSubmit/, "question example click does not submit the form");
assert.doesNotMatch(exampleClick[1], /runExperience/, "question example click does not start a reading");
assert.match(css, /\.question-examples \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/, "question examples use a compact desktop grid");
assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.question-examples \{[\s\S]*grid-template-columns: 1fr;/, "question examples collapse on mobile");
const followupSubmit = html.match(/els\.followupCustomForm\.addEventListener\("submit",\s*\(event\) => \{([\s\S]*?)\n\s*}\);/);
assert.ok(followupSubmit, "followup submit listener exists");
assert.doesNotMatch(followupSubmit[1], /requestSubmit/, "ordinary followup submit does not trigger the ritual form");
assert.doesNotMatch(followupSubmit[1], /playRitual/, "ordinary followup submit does not start the ritual");
assert.match(html, /els\.followupPanel\.addEventListener\("click"[\s\S]*if \(kind === "clarify-card"\) \{[\s\S]*drawClarificationCard\(\);[\s\S]*return;[\s\S]*showFollowupAnswer\(kind\);/, "preset followup buttons submit immediately while clarify-card stays inside the follow-up flow");
const drawClarification = html.match(/function drawClarificationCard\(\) \{([\s\S]*?)\n\s*}\n\n      function initFieldCanvas/);
assert.ok(drawClarification, "clarification helper exists");
assert.doesNotMatch(drawClarification[1], /requestSubmit|playRitual|setMode\("tarot"\)/, "clarification follow-up does not restart the main reading flow");
assert.match(drawClarification[1], /showFollowupAnswer\("clarify-card"\)/, "clarification follow-up renders inline on the result page");
assert.match(html, /submit\.disabled = isFollowupRunning \|\| !hasCustomText;/, "custom followup input stays explicit submit");

assert.match(prompt, /Do not draw a new card/, "followup prompt forbids a new draw");
assert.match(prompt, /Do not predict the future/, "followup prompt forbids prediction");
assert.match(prompt, /one small observation or action/, "followup prompt asks for one specific observation or action");
assert.match(prompt, /Current result summary:[\s\S]*User follow-up:/, "followup prompt places dynamic summary before follow-up question");

const promptUrl = pathToFileURL(resolve("supabase/functions/_shared/prompts/followup.ts")).href;
const routerUrl = pathToFileURL(resolve("supabase/functions/_shared/model-router.ts")).href;

function runTsScript(script) {
  return execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    { encoding: "utf8" },
  ).trim();
}

const promptJson = runTsScript(`
  import { buildFollowupPrompt } from ${JSON.stringify(promptUrl)};
  const text = buildFollowupPrompt({
    mode: "followup",
    originalQuestion: "Should I stay or leave?",
    resultSummary: "The result points to noticing the pressure before deciding.",
    followupQuestion: "What should I do tonight?",
    language: "en",
  });
  console.log(JSON.stringify({ text }));
`);
const promptResult = JSON.parse(promptJson);
assert.match(promptResult.text, /Should I stay or leave\?/, "prompt includes original question");
assert.match(promptResult.text, /noticing the pressure/, "prompt includes result summary");
assert.match(promptResult.text, /What should I do tonight\?/, "prompt includes user follow-up");
assert.match(promptResult.text, /Answer in 2 to 4 concise sentences/, "prompt keeps followup compact");

const routeJson = runTsScript(`
  import { resolveModelRoute } from ${JSON.stringify(routerUrl)};
  const route = resolveModelRoute(
    {
      mode: "followup",
      originalQuestion: "What is happening?",
      resultSummary: "A compact summary.",
      followupQuestion: "What now?",
      language: "en",
    },
    {
      llm: { provider: "deepseek", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com/v1", temperature: 0.7, maxTokens: 2048 },
      models: {
        basic: { model: "deepseek-v4-flash", maxTokens: 1200, thinking: false, enabled: true },
        pro: { model: "deepseek-v4-pro", maxTokens: 2200, thinking: true, reasoningEffort: "high", enabled: false },
      },
      translations: {},
    },
  );
  console.log(JSON.stringify(route));
`);
const route = JSON.parse(routeJson);
assert.equal(route.entry, "followup", "followup mode uses followup entry");
assert.equal(route.tier, "basic", "followup defaults to basic tier");
assert.equal(route.model, "deepseek-v4-flash", "followup defaults to flash");
assert.equal(route.maxTokens, 700, "followup uses short output cap");
assert.equal(route.thinking.type, "disabled", "basic followup does not use thinking");

console.log("phase2 followup contract passed");
