import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { appSource } from "./helpers/app-source.mjs";

const adminHtml = readFileSync(new URL("../admin.html", import.meta.url), "utf8");
const indexHtml = appSource;
const modelRouterTs = readFileSync(new URL("../supabase/functions/_shared/model-router.ts", import.meta.url), "utf8");
const providerTs = readFileSync(new URL("../supabase/functions/_shared/providers/openai-compatible.ts", import.meta.url), "utf8");
const reflectionReadingJs = readFileSync(new URL("../assets/app/reflection-reading.js", import.meta.url), "utf8");

assert.doesNotMatch(adminHtml, /name="(?:llm\.provider|llm\.model|models\.basic\.model|models\.pro\.model)"/, "admin does not expose editable provider or model routing fields");
assert.match(adminHtml, /data-route-status="provider"/, "admin reports the fixed provider as read-only status");
assert.match(adminHtml, /data-route-status="basicModel"/, "admin reports the basic route as read-only status");
assert.match(adminHtml, /data-route-status="proModel"/, "admin reports the pro route as read-only status");
assert.match(adminHtml, /name="models\.basic\.maxTokens"/, "admin still exposes the safe basic token budget");
assert.match(adminHtml, /name="models\.pro\.reasoningEffort"/, "admin still exposes the pro reasoning policy");
assert.match(adminHtml, /models:\s*\{\s*basic:\s*\{\s*\},\s*pro:\s*\{\s*\}\s*\}/, "admin form reads model tiers into the config object");
assert.match(adminHtml, /field\.name\.includes\("\."\)/, "admin form treats dotted names as direct config paths");

assert.match(reflectionReadingJs, /tier:\s*"basic",\s*entry,/, "reflection request sends the basic tier and selected entry route");
assert.match(indexHtml, /entry:\s*"tarot"/, "tarot flow selects the tarot route");
assert.match(indexHtml, /tier:\s*"basic",\s*entry:\s*"meihua"/, "front-end sends route hints for meihua");
assert.doesNotMatch(indexHtml, /llm:\s*\{\s*provider:/, "front-end no longer sends provider selection in reading requests");
assert.doesNotMatch(indexHtml, /llm:\s*\{\s*model:/, "front-end no longer sends model selection in reading requests");

assert.match(modelRouterTs, /function resolveModelRoute/, "model router helper exists");
assert.match(modelRouterTs, /return tier === "pro" \? "deepseek-v4-pro" : "deepseek-v4-flash";/, "model router normalizes model choice from tier only");
assert.match(modelRouterTs, /const entryCap = ENTRY_TOKEN_CAP\[entry\]/, "model router caps tokens by entry");
assert.match(providerTs, /reasoning_content\?: string/, "stream parser is aware of reasoning content but does not surface it");

if (!process.allowedNodeEnvironmentFlags.has("--experimental-strip-types")) {
  console.log("phase1.5 model router static tests passed; runtime TypeScript checks require Node 22+");
  process.exit(0);
}

const modelRouterUrl = pathToFileURL(resolve("supabase/functions/_shared/model-router.ts")).href;
const providerUrl = pathToFileURL(resolve("supabase/functions/_shared/providers/openai-compatible.ts")).href;

function runTsScript(script) {
  return execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    { encoding: "utf8" },
  ).trim();
}

const routeBasicJson = runTsScript(`
  import { resolveModelRoute } from ${JSON.stringify(modelRouterUrl)};
  const route = resolveModelRoute(
    {
      mode: "reading",
      cardName: "The Fool",
      orientation: "upright",
      intent: "clarify",
      question: "What now?",
      round: 1,
      sessionHistory: "",
      language: "en",
      tier: "pro",
      entry: "tarot",
      llm: { provider: "deepseek", model: "deepseek-v4-pro", maxTokens: 9999, temperature: 0.2 },
    },
    {
      llm: { provider: "deepseek", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com/v1", temperature: 0.7, maxTokens: 2048 },
      models: {
        basic: { model: "deepseek-v4-flash", maxTokens: 1200, thinking: false, enabled: true },
        pro: { model: "deepseek-v4-pro", maxTokens: 2200, thinking: true, reasoningEffort: "high", enabled: false },
      },
      paid: { proModelEnabled: false },
      translations: {},
    },
    "pro",
  );
  console.log(JSON.stringify(route));
`);
const routeBasic = JSON.parse(routeBasicJson);
assert.equal(routeBasic.tier, "basic", "disabled pro tier falls back to basic");
assert.equal(routeBasic.model, "deepseek-v4-flash", "frontend cannot force pro model through llm.model");
assert.equal(routeBasic.entry, "tarot");
assert.equal(routeBasic.maxTokens, 1200, "basic tier respects the basic token cap");
assert.deepEqual(routeBasic.thinking, { type: "disabled" });
assert.equal(routeBasic.reasoningEffort, undefined);

const routeProJson = runTsScript(`
  import { resolveModelRoute } from ${JSON.stringify(modelRouterUrl)};
  const route = resolveModelRoute(
    {
      mode: "advice",
      cardName: "The Star",
      orientation: "upright",
      intent: "support",
      question: "What should I do?",
      sessionSummary: "context",
      language: "en",
      tier: "pro",
      entry: "dual",
    },
    {
      llm: { provider: "deepseek", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com/v1", temperature: 0.7, maxTokens: 2048 },
      models: {
        basic: { model: "deepseek-v4-flash", maxTokens: 1200, thinking: false, enabled: true },
        pro: { model: "deepseek-v4-pro", maxTokens: 3000, thinking: true, reasoningEffort: "max", enabled: true },
      },
      paid: { proModelEnabled: true },
      translations: {},
    },
    "pro",
  );
  console.log(JSON.stringify(route));
`);
const routePro = JSON.parse(routeProJson);
assert.equal(routePro.tier, "pro", "enabled pro tier stays on pro");
assert.equal(routePro.model, "deepseek-v4-pro", "pro tier always selects the pro model");
assert.equal(routePro.entry, "dual");
assert.equal(routePro.thinking.type, "enabled");
assert.equal(routePro.reasoningEffort, "max");
assert.equal(routePro.maxTokens, 2200, "entry cap still limits pro token budget");

const providerJson = runTsScript(`
  import { OpenAICompatibleProvider } from ${JSON.stringify(providerUrl)};

  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    if (calls.length === 1) {
      return new Response(JSON.stringify({ choices: [{ message: { content: "  calm result  " } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(${JSON.stringify('data: {"choices":[{"delta":{"reasoning_content":"think"}}]}\n\n')}));
        controller.enqueue(encoder.encode(${JSON.stringify('data: {"choices":[{"delta":{"content":"A"}}]}\n\n')}));
        controller.enqueue(encoder.encode(${JSON.stringify('data: {"choices":[{"delta":{"content":"B"}}]}\n\n')}));
        controller.enqueue(encoder.encode(${JSON.stringify('data: [DONE]\n\n')}));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  const provider = new OpenAICompatibleProvider({
    name: "deepseek",
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key",
    model: "deepseek-v4-pro",
  });

  const text = await provider.chat(
    [{ role: "user", content: "hello" }],
    {
      temperature: 0.2,
      maxTokens: 1234,
      topP: 0.8,
      thinking: { type: "enabled" },
      reasoningEffort: "high",
    },
  );

  const stream = [];
  for await (const chunk of provider.chatStream(
    [{ role: "user", content: "hello" }],
    {
      temperature: 0.2,
      maxTokens: 987,
      topP: 0.7,
      thinking: { type: "enabled" },
      reasoningEffort: "max",
    },
  )) {
    stream.push(chunk);
  }

  console.log(JSON.stringify({ calls, text, stream }));
`);
const providerResult = JSON.parse(providerJson);
assert.equal(providerResult.calls.length, 2, "provider should issue one chat and one streaming request");
assert.equal(providerResult.calls[0].thinking.type, "enabled", "chat request forwards thinking mode");
assert.equal(providerResult.calls[0].reasoning_effort, "high", "chat request forwards reasoning effort");
assert.equal(providerResult.calls[0].max_tokens, 1234, "chat request forwards token budget");
assert.equal(providerResult.text, "calm result", "chat trims the response content");
assert.equal(providerResult.calls[1].thinking.type, "enabled", "stream request forwards thinking mode");
assert.equal(providerResult.calls[1].reasoning_effort, "max", "stream request forwards reasoning effort");
assert.deepEqual(providerResult.stream, ["A", "B"], "stream parser ignores reasoning content and yields content chunks only");

console.log("phase1.5 model router tests passed");
