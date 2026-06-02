import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const validator = readFileSync(new URL("../supabase/functions/_shared/token-validator.ts", import.meta.url), "utf8");
const reading = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../supabase/functions/_shared/prompts/clarify.ts", import.meta.url), "utf8");

assert.match(types, /mode:\s*"clarify"/, "clarify request mode remains typed for backend compatibility");
assert.match(validator, /CLARIFIED_QUESTION/, "clarified question token is required");
assert.match(validator, /CLARIFY_NOTE/, "clarify note token is required");
assert.match(reading, /buildClarifyPrompt/, "reading function keeps clarify prompt route");
assert.match(prompt, /\[CLARIFIED_QUESTION\]/, "clarify prompt asks for question token");
assert.match(prompt, /\[CLARIFY_NOTE\]/, "clarify prompt asks for note token");

const readingPrompt = readFileSync(new URL("../supabase/functions/_shared/prompts/reading.ts", import.meta.url), "utf8");
assert.match(validator, /CORE_QUESTION/, "core question token is required for tarot");
assert.match(validator, /TENSION/, "tension token is required for tarot");
assert.match(validator, /JUDGMENT/, "judgment token is required for tarot");
assert.match(readingPrompt, /\[CORE_QUESTION\]/, "reading prompt asks for core question");
assert.match(readingPrompt, /\[TENSION\]/, "reading prompt asks for tension");
assert.match(readingPrompt, /\[JUDGMENT\]/, "reading prompt asks for judgment");

const tarotCards = html.match(/\["[^"]+",\s*"[^"]+",\s*"\d\d-[^"]+\.jpg"\]/g) || [];
assert.equal(tarotCards.length, 22, "front-end tarot deck includes 22 major arcana cards");
assert.doesNotMatch(html, /id="clarify-box"/, "front-end no longer blocks drawing with a clarification box");
assert.doesNotMatch(html, /id="clarify-confirm"/, "front-end has no confirm-before-draw action");
assert.doesNotMatch(html, /id="clarify-retry"/, "front-end has no retry clarification action");
assert.doesNotMatch(html, /id="clarify-edit"/, "front-end has no edit clarification action");
assert.doesNotMatch(html, /clarifyTarotQuestion/, "front-end does not call a clarification round before the ritual");

assert.match(html, /id="ritual-deck"/, "front-end has a ritual deck container");
assert.match(html, /function buildRitualDeck/, "front-end builds ritual cards from deck data");
assert.match(html, /tarotDeck\.forEach/, "front-end renders every tarot deck card into the ritual");
assert.match(html, /is-cutting/, "front-end has a cut-card phase");
assert.match(html, /is-spread/, "front-end has a spread phase");
assert.match(html, /await waitForCardChoice\(\)/, "front-end waits for the user to choose a card");
assert.match(html, /const selectedCard = await playRitual\(mode\)/, "front-end carries the selected card out of the ritual");
assert.doesNotMatch(html, /selectedCard \|\| randomItem\(tarotDeck\)/, "result rendering does not replace the chosen card with a random fallback");
assert.equal((html.match(/const card = selectedCard;/g) || []).length, 2, "tarot and dual results both use the selected card");

assert.match(html, /id="tarot-reading-grid"/, "front-end has tarot reading grid");
assert.match(html, /id="tarot-core-question"/, "front-end renders core question");
assert.match(html, /id="tarot-tension"/, "front-end renders tension");
assert.match(html, /id="tarot-judgment"/, "front-end renders judgment");
assert.match(html, /renderTarotReading/, "front-end renders structured tarot response");

assert.match(html, /modeDual:\s*"双象报告"/, "front-end has dual report mode label");
assert.match(html, /modeHintDual:\s*"同时参考牌象与卦象，整理成摘要、依据、行动和复盘。"/, "dual mode explains compact report structure");
assert.match(html, /again:\s*"回到问题"/, "result primary action is labeled as returning to the question");
const againListener = html.match(/els\.again\.addEventListener\("click",\s*\(\)\s*=>\s*{([\s\S]*?)\n\s*}\);/);
assert.ok(againListener, "return-to-question listener exists");
assert.doesNotMatch(againListener[1], /requestSubmit/, "return-to-question action does not resubmit the form");
assert.match(html, /followupLabel:\s*"继续探索这次结果"/, "follow-up label is scoped to the current result");
assert.match(html, /data-followup-question="clarify-card"/, "clarification card is an explicit follow-up choice");
assert.match(html, /id="new-reading-btn"/, "new-reading action is separate from view and tool buttons");
assert.match(html, /is-daily-note/, "daily mode has a dedicated UI state");

console.log("clarify contract passed");
