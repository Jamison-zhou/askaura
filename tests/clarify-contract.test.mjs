import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appSource } from "./helpers/app-source.mjs";

const html = appSource;
const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const validator = readFileSync(new URL("../supabase/functions/_shared/token-validator.ts", import.meta.url), "utf8");
const reading = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");
const clarifyPrompt = readFileSync(new URL("../supabase/functions/_shared/prompts/clarify.ts", import.meta.url), "utf8");
const readingPrompt = readFileSync(new URL("../supabase/functions/_shared/prompts/reading.ts", import.meta.url), "utf8");
const ritualEngine = readFileSync(new URL("../assets/app/ritual-engine.js", import.meta.url), "utf8");

assert.match(types, /mode:\s*"clarify"/, "clarify request mode remains typed for backend compatibility");
assert.match(validator, /CLARIFIED_QUESTION/, "clarified question token is required");
assert.match(validator, /CLARIFY_NOTE/, "clarify note token is required");
assert.match(reading, /buildClarifyPrompt/, "reading function keeps clarify prompt route");
assert.match(clarifyPrompt, /\[CLARIFIED_QUESTION\]/, "clarify prompt asks for question token");
assert.match(clarifyPrompt, /\[CLARIFY_NOTE\]/, "clarify prompt asks for note token");

assert.match(validator, /reading: \["REFLECTION", "HIDDEN", "VERIFY", "ACTION"\]/, "reading requires the four reflection tokens");
assert.match(readingPrompt, /\[REFLECTION\]/, "reading prompt asks for grounded reflection");
assert.match(readingPrompt, /\[HIDDEN\]/, "reading prompt asks for a tentative hidden hypothesis");
assert.match(readingPrompt, /\[VERIFY\]/, "reading prompt asks for verification");
assert.match(readingPrompt, /\[ACTION\]/, "reading prompt asks for an action");

assert.match(ritualEngine, /REFLECTION_DECK/, "ritual engine uses the reflection deck");
assert.match(html, /const reflectionDeck = REFLECTION_DECK;/, "front-end uses the reflection deck data");
assert.match(html, /id="question-assist"/, "front-end has a non-blocking question assist panel");
assert.match(html, /function shouldOfferQuestionAssist/, "front-end uses a local question assist heuristic");
assert.match(html, /mode:\s*"clarify"/, "front-end reuses the clarify backend mode");
assert.match(html, /skipQuestionAssist/, "front-end can continue after a question assist choice");
assert.match(html, /questionAssistAccept/, "front-end has accept copy for the question assist");
assert.match(html, /questionAssistOriginal/, "front-end has original-question copy for the question assist");

assert.match(html, /id="ritual-deck"/, "front-end has a ritual deck container");
assert.match(html, /function buildRitualDeck/, "front-end builds ritual cards from deck data");
assert.match(html, /reflectionDeck\.forEach/, "front-end renders the authored reflection deck");
assert.match(html, /is-cutting/, "front-end has a cut-card phase");
assert.match(html, /is-spread/, "front-end has a spread phase");
assert.match(html, /function waitForCardChoice\(position = \{ key: "single", category: null, label: "" \}, excludedIndexes = \[\]\)/, "front-end waits for a position-aware card choice");
assert.match(html, /const selection = await waitForCardChoice\(position, excludedIndexes\)/, "front-end collects each reflection position sequentially");
assert.match(html, /const ritualResult = await playRitual\(mode\)/, "front-end carries the ritual result into generation");
assert.doesNotMatch(html, /selectedCard \|\| randomItem/, "result rendering does not replace the chosen card with a random fallback");
assert.match(html, /ritualResult\?\.cards\?\.length/, "tarot and dual results require a user-selected ritual card");

assert.match(html, /id="tarot-reading-grid"/, "front-end has the reflection reading grid");
assert.match(html, /id="tarot-core-question"/, "front-end renders the reflected signal");
assert.match(html, /id="tarot-tension"/, "front-end renders the hidden hypothesis");
assert.match(html, /id="tarot-judgment"/, "front-end renders verification guidance");
assert.match(html, /renderReflectionReading/, "front-end renders the structured reflection response");
assert.match(html, /const hasReportSection = Boolean\(tarotText \|\| guaText \|\| dualText\);/, "empty report sections are explicitly detected");
assert.match(html, /els\.reportStack\.hidden = !\(shouldShowReportStack && hasReportSection\);/, "report stack stays hidden when every report section is empty");

assert.match(html, /modeDual:\s*"双象报告"/, "front-end has the dual report mode label");
assert.match(html, /again:\s*"回到问题"/, "result primary action returns to the question");
const againListener = html.match(/els\.again\.addEventListener\("click",\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/);
assert.ok(againListener, "return-to-question listener exists");
assert.doesNotMatch(againListener[1], /requestSubmit/, "return-to-question action does not resubmit the form");
assert.match(html, /data-followup-question="clarify-card"/, "clarification card is an explicit follow-up choice");
assert.match(html, /function drawClarificationCard\(\)[\s\S]*els\.form\.requestSubmit\(\)/, "clarification card starts a new draw flow");
assert.match(html, /if \(kind === "clarify-card"\) \{[\s\S]*drawClarificationCard\(\);[\s\S]*return;/, "clarification card is separated from ordinary follow-ups");
assert.match(html, /els\.followupCustomForm\.addEventListener\("submit"[\s\S]*event\.preventDefault\(\);[\s\S]*showFollowupAnswer/, "ordinary follow-ups append an answer without submitting a new reading");
assert.match(html, /function resetExperience\(\)[\s\S]*lastRecord = null;[\s\S]*currentResultContext = null;/, "reset clears result context used by follow-ups");
const runExperience = html.match(/async function runExperience\(event\) \{([\s\S]*?)\n\s*function renderAction/);
assert.ok(runExperience, "runExperience exists");
assert.doesNotMatch(runExperience[1], /lastRecord = null;[\s\S]*await playRitual/, "starting a new reading preserves the previous result until success");
assert.doesNotMatch(runExperience[1], /currentResultContext = null;[\s\S]*await playRitual/, "starting a new reading preserves follow-up context until success");
assert.match(html, /id="new-reading-btn"/, "new-reading action is separate from result tools");

console.log("clarify contract passed");
