import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appSource } from "./helpers/app-source.mjs";

const html = appSource;
const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const validator = readFileSync(new URL("../supabase/functions/_shared/token-validator.ts", import.meta.url), "utf8");
const reading = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../supabase/functions/_shared/prompts/clarify.ts", import.meta.url), "utf8");
const ritualEngine = readFileSync(new URL("../assets/app/ritual-engine.js", import.meta.url), "utf8");

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
assert.match(validator, /AVOID/, "avoid token is required for tarot");
assert.match(validator, /WATCH/, "watch token is required for tarot");
assert.match(readingPrompt, /\[CORE_QUESTION\]/, "reading prompt asks for core question");
assert.match(readingPrompt, /\[TENSION\]/, "reading prompt asks for tension");
assert.match(readingPrompt, /\[JUDGMENT\]/, "reading prompt asks for judgment");
assert.match(readingPrompt, /\[AVOID\]/, "reading prompt asks for avoid guidance");
assert.match(readingPrompt, /\[WATCH\]/, "reading prompt asks for watch guidance");

const tarotCards = ritualEngine.match(/\["[^"]+",\s*"[^"]+",\s*"\d\d-[^"]+\.jpg"\]/g) || [];
assert.equal(tarotCards.length, 22, "ritual engine tarot deck includes 22 major arcana cards");
assert.match(html, /const tarotDeck = TAROT_DECK;/, "front-end uses ritual engine tarot deck data");
assert.match(html, /id="question-assist"/, "front-end has a non-blocking question assist panel");
assert.match(html, /function shouldOfferQuestionAssist/, "front-end uses a local question assist heuristic");
assert.match(html, /mode:\s*"clarify"/, "front-end reuses the clarify backend mode");
assert.match(html, /skipQuestionAssist/, "front-end can continue after a question assist choice");
assert.match(html, /questionAssistAccept/, "front-end has accept copy for the question assist");
assert.match(html, /questionAssistOriginal/, "front-end has original-question copy for the question assist");

assert.match(html, /id="ritual-deck"/, "front-end has a ritual deck container");
assert.match(html, /function buildRitualDeck/, "front-end builds ritual cards from deck data");
assert.match(html, /ritualVisibleIndexes\(tarotDeck\.length, 15\)/, "front-end limits the visible ritual deck for responsive performance");
assert.match(html, /visibleIndexes\.forEach/, "front-end renders the selected ritual deck subset");
assert.match(html, /is-cutting/, "front-end has a cut-card phase");
assert.match(html, /is-spread/, "front-end has a spread phase");
assert.match(html, /function waitForCardChoice\(positionLabel = "", excludedIndexes = \[\]\)/, "front-end waits for the user to choose a card with optional spread position");
assert.match(html, /const selection = await waitForCardChoice\(positions\.length > 1 \? position\.label : "", excludedIndexes\)/, "front-end can collect sequential spread card choices");
assert.match(html, /const ritualResult = await playRitual\(mode\)/, "front-end carries ritual result out of the ritual");
assert.doesNotMatch(html, /selectedCard \|\| randomItem\(tarotDeck\)/, "result rendering does not replace the chosen card with a random fallback");
assert.match(html, /ritualResult\?\.cards\?\.length/, "tarot and dual results require a user-selected ritual card");

assert.match(html, /id="tarot-reading-grid"/, "front-end has tarot reading grid");
assert.match(html, /id="tarot-core-question"/, "front-end renders core question");
assert.match(html, /id="tarot-tension"/, "front-end renders tension");
assert.match(html, /id="tarot-judgment"/, "front-end renders judgment");
assert.match(html, /renderTarotReading/, "front-end renders structured tarot response");
assert.match(html, /avoid:\s*cleanTaggedOutputText\(tokens\.AVOID/, "front-end parses AI avoid guidance");
assert.match(html, /watch:\s*cleanTaggedOutputText\(tokens\.WATCH/, "front-end parses AI watch guidance");
assert.match(html, /const hasReportSection = Boolean\(tarotText \|\| guaText \|\| dualText\);/, "empty report sections are explicitly detected");
assert.match(html, /els\.reportStack\.hidden = !\(shouldShowReportStack && hasReportSection\);/, "report stack stays hidden when every report section is empty");

assert.match(html, /modeDual:\s*"双象报告"/, "front-end has dual report mode label");
assert.match(html, /modeHintDual:\s*"同时参考牌象与卦象，整理成摘要、依据、行动和复盘。"/, "dual mode explains compact report structure");
assert.match(html, /again:\s*"回到问题"/, "result primary action is labeled as returning to the question");
const againListener = html.match(/els\.again\.addEventListener\("click",\s*\(\)\s*=>\s*{([\s\S]*?)\n\s*}\);/);
assert.ok(againListener, "return-to-question listener exists");
assert.doesNotMatch(againListener[1], /requestSubmit/, "return-to-question action does not resubmit the form");
assert.match(html, /followupLabel:\s*"继续探索这次结果"/, "follow-up label is scoped to the current result");
assert.match(html, /data-followup-question="clarify-card"/, "clarification card is an explicit follow-up choice");
assert.match(html, /function drawClarificationCard\(\)[\s\S]*els\.form\.requestSubmit\(\)/, "clarification card starts a new draw flow");
assert.match(html, /if \(kind === "clarify-card"\) \{[\s\S]*drawClarificationCard\(\);[\s\S]*return;/, "clarification card is separated from ordinary follow-up answers");
assert.match(html, /els\.followupCustomForm\.addEventListener\("submit"[\s\S]*event\.preventDefault\(\);[\s\S]*showFollowupAnswer/, "ordinary follow-ups append an answer without submitting the reading form");
assert.match(html, /function resetExperience\(\)[\s\S]*lastRecord = null;[\s\S]*currentResultContext = null;/, "reset clears result context used by follow-ups");
const runExperience = html.match(/async function runExperience\(event\) \{([\s\S]*?)\n\s*function renderAction/);
assert.ok(runExperience, "runExperience exists");
assert.doesNotMatch(runExperience[1], /lastRecord = null;[\s\S]*await playRitual/, "starting a new reading does not clear previous result context before success");
assert.doesNotMatch(runExperience[1], /currentResultContext = null;[\s\S]*await playRitual/, "starting a new reading does not clear follow-up context before success");
assert.match(html, /id="new-reading-btn"/, "new-reading action is separate from view and tool buttons");
assert.match(html, /is-daily-note/, "daily mode has a dedicated UI state");

console.log("clarify contract passed");
