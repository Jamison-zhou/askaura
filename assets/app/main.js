      import {
        clearDailyAnchors,
        clearHistory,
        clearLocalRecords,
        cleanupExpiredTemporaryRecords,
        createStorage,
        loadDailyAnchor,
        loadHistory,
        saveDailyAnchor,
        saveHistoryRecord,
        todayKey
      } from "./storage.js";
      import { guaFromCast, guaFromTime } from "./meihua.js";
      import {
        primaryCardFromRecordCards as selectPrimaryCardFromRecordCards,
        recordCardFromSelection as buildRecordCardFromSelection,
        ritualCardLayout,
        ritualSpreadTypeForMode,
        spreadDisplayName as ritualSpreadDisplayName,
        spreadPositions as ritualSpreadPositions
      } from "./ritual-engine.js";
      import { REFLECTION_DECK, reflectionCardForSelection } from "./reflection-deck.js";
      import { buildReflectionReadingRequest, completeReflectionReading } from "./reflection-reading.js";
      import {
        buildObservationShareSvg,
        imageSourceToDataUrl,
        svgToPngBlob as renderSharePngBlob
      } from "./share-image.js?v=20260723-share-wrap-v1";
      import { deriveCompanionSnapshot } from "./companion.js";
      import { createReadingClient } from "./reading-client.js";
      import { createProductEventClient } from "./product-events.js";
      import { buildDualReadingRequest, prepareObservation } from "./controllers/observation-controller.js";
      import {
        addJourneyEcho,
        confirmResultAction,
        confirmResultInsight,
        createTemporaryResult,
        saveResultObservation,
        updateJourneyState
      } from "./controllers/journey-controller.js";
      import {
        actionFromRecord as actionFromResultRecord,
        buildActionAdvice,
        cleanTaggedOutputText,
        describeGua,
        hasContextualActionAdvice,
        meihuaReportFromText,
        parseTaggedTokens,
        reportFromRecord as normalizeReportFromRecord
      } from "./result-renderer.js";
      import {
        appendFollowupToRecord,
        clarificationHistoryText as buildClarificationHistoryText,
        clarificationLinkText as buildClarificationLinkText,
        clarificationPromptText,
        createClarificationContext,
        createFollowupEntry,
        followupQuestionText as selectFollowupQuestionText,
        followupResultSummary as buildFollowupResultSummary
      } from "./followup.js";
      import { buildCompactShareLines as formatCompactShareLines } from "./share-text.js";
      import { getAskAuraConfig } from "./config.js";
      import { systemConvergenceEnabled } from "./feature-flags.js";
      import { deriveHomeState } from "./journey-model.js";
      import { renderHome } from "./views/home-view.js";
      import { renderObservationRecommendation } from "./views/observation-view.js";
      import { renderResultWorkflow, setSuccessfulResultActions } from "./views/result-view.js";
      import { renderJourneyView } from "./views/journey-view.js";
      import { renderSettingsView } from "./views/settings-view.js";
      import { createSyncClient } from "./sync.js";
      import { nextToneForMode } from "./ui-state.js";
      import { getAppElements } from "./dom.js";
      import { translations } from "./i18n.js";

      const isSystemV1 = systemConvergenceEnabled();
      document.documentElement.dataset.systemVersion = isSystemV1 ? "v1" : "legacy";
      const publicConfig = getAskAuraConfig(window);
      const API_URL = publicConfig.supabaseUrl + "/functions/v1/reading";
      const CONFIG_API_URL = publicConfig.supabaseUrl + "/functions/v1/admin-config";
      const API_AUTH = "Bearer " + publicConfig.anonKey;
      const CONFIG_KEY = "askaura_admin_config_v1";
      let adminConfig = {};
      const recordStore = createStorage();
      const syncClient = createSyncClient({
        supabaseUrl: publicConfig.supabaseUrl,
        anonKey: publicConfig.anonKey,
        store: recordStore
      });
      const readingClient = createReadingClient({
        apiUrl: API_URL,
        authToken: API_AUTH,
        getLlmOptions
      });
      const productEvents = createProductEventClient({
        supabaseUrl: publicConfig.supabaseUrl,
        anonKey: publicConfig.anonKey
      });

      function mergeConfig(target, source) {
        if (!source || typeof source !== "object") return target;
        Object.entries(source).forEach(([key, value]) => {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            target[key] = mergeConfig(target[key] || {}, value);
          } else if (value !== undefined && value !== null && value !== "") {
            target[key] = value;
          }
        });
        return target;
      }

      async function loadAdminConfig() {
        try {
          const response = await fetch(CONFIG_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: API_AUTH
            },
            body: JSON.stringify({ action: "public" })
          });
          if (!response.ok) return false;
          let payload;
          try {
            payload = await response.json();
          } catch (error) {
            console.warn("Invalid admin config", error);
            return false;
          }
          if (!payload || typeof payload !== "object") {
            console.warn("Invalid admin config", payload);
            return false;
          }
          const parsed = payload.config;
          if (parsed && typeof parsed !== "object") {
            console.warn("Invalid admin config", parsed);
            return false;
          }
          adminConfig = parsed || {};
          if (adminConfig.translations) mergeConfig(translations, adminConfig.translations);
          return true;
        } catch {
          return false;
        }
      }

      function clampNumber(value, fallback, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
      }

      function getLlmOptions() {
        const llm = adminConfig.llm || {};
        return {
          temperature: clampNumber(llm.temperature, 0.7, 0, 1.5)
        };
      }

      const reflectionDeck = REFLECTION_DECK;

      const els = getAppElements();
      if (isSystemV1 && els.save) els.save.hidden = true;

      let lang = "zh";
      let mode = "tarot";
      let lastAction = "";
      let lastQuestion = "";
      let lastRecord = null;
      let currentResultContext = null;
      let selectedFollowupKind = "";
      let isRunning = false;
      let isFollowupRunning = false;
      let isWeeklySummaryRunning = false;
      let pendingClarificationContext = null;
      let historyFilter = "all";
      let currentShareLink = null;
      let currentResonanceSubmission = null;
      let lastWeeklySummaryText = "";
      let selectedSpreadType = "single";
      let selectedGuaCastMethod = "time";
      let activeRitualCancel = null;
      let placeholderIndex = 0;
      let currentRitualStatusKey = "ritualIdle";
      let brandLoadingStartedAt = 0;
      const THEME_STORAGE_KEY = "askaura.theme.v1";
      const LANGUAGE_STORAGE_KEY = "askaura.language.v1";
      const ANALYTICS_DISABLED_KEY = "askaura.analytics.disabled.v1";
      function t(key) {
        return translations[lang][key] || translations.zh[key] || key;
      }

      function renderAdaptiveHome() {
        if (!isSystemV1 || !els.adaptiveHome) {
          if (els.adaptiveHome) els.adaptiveHome.hidden = true;
          els.composePanel.hidden = false;
          return;
        }
        const records = cleanupExpiredTemporaryRecords(recordStore);
        renderHome(els.adaptiveHome, deriveHomeState(records));
        els.composePanel.hidden = true;
        els.room.dataset.step = "idle";
        syncRailNav();
      }

      function openObservationEntry(record = null) {
        if (record) {
          const nextMode = ["tarot", "meihua", "dual"].includes(record.mode) ? record.mode : "tarot";
          setMode(nextMode);
          els.input.value = record.question || "";
        }
        if (els.adaptiveHome) els.adaptiveHome.hidden = true;
        els.composePanel.hidden = false;
        els.room.dataset.step = "idle";
        updateModeRecommendation();
        setTimeout(() => els.input.focus(), 60);
      }

      function homeRecord(recordId) {
        return loadHistory(recordStore).find((record) => record.id === recordId) || null;
      }

      function handleHomeAction(event) {
        const button = event.target.closest("[data-home-action]");
        if (!button) return;
        const record = homeRecord(button.dataset.recordId);
        if (button.dataset.homeAction === "start") openObservationEntry();
        if (button.dataset.homeAction === "resume") openObservationEntry(record);
        if (button.dataset.homeAction === "echo") {
          renderJourney(record?.id || "");
          openUtilityPanel(els.companionPanel);
        }
        if (button.dataset.homeAction === "journey") {
          openCompanionPanel();
        }
      }

      function updateModeRecommendation() {
        if (!els.modeRecommendation) return;
        renderObservationRecommendation({
          container: els.modeRecommendation,
          name: els.modeRecommendationName,
          reason: els.modeRecommendationReason
        }, { question: els.input.value, translate: t });
      }

      function applyTheme(nextTheme, persist = true) {
        const theme = ["night", "light", "mono"].includes(nextTheme) ? nextTheme : "night";
        document.documentElement.dataset.theme = theme;
        els.themeBtns.forEach((button) => {
          const selected = button.dataset.themeSetting === theme;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
        if (!persist) return;
        try {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {}
      }

      function cleanText(value, fallback = t("emptyFallback")) {
        const text = String(value ?? "").replace(/\s+/g, " ").trim();
        if (!text || text === "undefined" || text === "null" || text === "NaN") return fallback;
        return text;
      }

      function modeLabelText(modeName) {
        const labels = {
          tarot: "modeTarot",
          meihua: "modeMeihua",
          dual: "modeDual",
          daily: "modeDaily",
        };
        return labels[modeName] ? t(labels[modeName]) : cleanText(modeName, "");
      }

      function normalizedTitleText(record = {}) {
        const title = cleanText(record.title, "");
        const modeLabel = modeLabelText(record.mode);
        if (!title || !modeLabel) return title;
        const prefixes = [`${modeLabel} · `, `${modeLabel}: `, `${modeLabel}：`];
        for (const prefix of prefixes) {
          if (title.startsWith(prefix)) return cleanText(title.slice(prefix.length), "");
        }
        return title === modeLabel ? "" : title;
      }

      function resultHeadingText(record = {}) {
        if (record.mode === "daily") return t("dailyNoteTitle");
        const detail = normalizedTitleText(record);
        const modeLabel = modeLabelText(record.mode);
        return [modeLabel, detail].filter(Boolean).join(" · ") || modeLabel || t("answerTitle");
      }

      function modeConfig(nextMode = mode) {
        const config = {
          tarot: {
            label: "modeTarot",
            hint: "modeHintTarot",
            primer: "modePrimerTarot",
            question: "questionLabel",
            placeholder: "questionPlaceholder",
            cast: "castTarot",
            generating: "generatingTarot",
            signals: ["signalTarotFocus", "signalTarot", "signalAi"]
          },
          meihua: {
            label: "modeMeihua",
            hint: "modeHintMeihua",
            primer: "modePrimerMeihua",
            question: "questionLabelMeihua",
            placeholder: "questionPlaceholderMeihua",
            cast: "castMeihua",
            generating: "generatingMeihua",
            signals: ["signalMoment", "signalGua", "signalAi"]
          },
          dual: {
            label: "modeDual",
            hint: "modeHintDual",
            primer: "modePrimerDual",
            question: "questionLabelDual",
            placeholder: "questionPlaceholderDual",
            cast: "castDual",
            generating: "generatingDual",
            signals: ["signalTarot", "signalGua", "signalAiSummary"]
          },
          daily: {
            label: "modeDaily",
            hint: "modeHintDaily",
            primer: "modeHintDaily",
            question: "questionLabelDaily",
            placeholder: "questionPlaceholderDaily",
            cast: "dailyNoteButton",
            generating: "loading",
            signals: ["signalMoment", "signalAi", "actionWatchLabel"]
          }
        };
        return config[nextMode] || config.tarot;
      }

      function spreadLabels() {
        return {
          spreadSingle: t("spreadSingle"),
          reflectionTriad: t("spreadReflectionTriad"),
          state: t("spreadPositionState"),
          relation: t("spreadPositionRelation"),
          movement: t("spreadPositionMovement")
        };
      }

      function spreadPositions(type = selectedSpreadType) {
        return ritualSpreadPositions(type, spreadLabels());
      }

      function spreadDisplayName(type = selectedSpreadType) {
        return ritualSpreadDisplayName(type, spreadLabels());
      }

      function updateSpreadSelector() {
        const show = mode === "tarot";
        els.spreadSelector.hidden = !show;
        if (!show) selectedSpreadType = "single";
        els.spreadBtns.forEach((button) => {
          button.classList.toggle("is-selected", button.dataset.spreadType === selectedSpreadType);
        });
      }

      function updateGuaCastSelector() {
        const show = mode === "meihua" || mode === "dual";
        els.guaCastSelector.hidden = !show;
        if (!show) selectedGuaCastMethod = "time";
        els.guaSeedInput.hidden = selectedGuaCastMethod === "time";
        els.guaCastBtns.forEach((button) => {
          button.classList.toggle("is-selected", button.dataset.guaCast === selectedGuaCastMethod);
        });
      }

      function updateSignalCopy() {
        modeConfig().signals.forEach((key, index) => {
          const node = els.signalRow.children[index];
          if (node) node.textContent = t(key);
        });
      }

      function refreshLocalizedUi() {
        document.documentElement.lang = lang;
        els.composePanel.dataset.mode = mode;
        els.signalRow.dataset.mode = mode;
        document.querySelectorAll("[data-i18n]").forEach((node) => {
          node.textContent = t(node.dataset.i18n);
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
          node.placeholder = t(node.dataset.i18nPlaceholder);
        });
        els.langBtns.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.lang === lang));
        updateModeHint();
        updateModeLabel();
        updateQuestionCopy();
        updateSignalCopy();
        updateRitualCardLabels();
        updateSpreadSelector();
        updateGuaCastSelector();
        setRitualStatus(currentRitualStatusKey);
        updatePlaceholderSample(true);
        updateDailyModeState();
        updateCastCopy();
        updateModeRecommendation();
        renderHistoryList();
        updateAuthUi();
      }

      function applyLanguage(nextLang) {
        lang = nextLang === "en" ? "en" : "zh";
        try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch {}
        refreshLocalizedUi();
      }

      function syncRailNav() {
        const isAnswer = els.room.dataset.step === "answer";
        const active = els.modeBtns.find((btn) => btn.dataset.mode === mode);
        els.entryNav?.classList.toggle("active", !isAnswer);
        els.modeBtns.forEach((btn) => btn.classList.toggle("active", isAnswer && btn === active));
      }

      function setMode(nextMode) {
        if (isRunning) return;
        mode = nextMode;
        if (mode !== "tarot") selectedSpreadType = "single";
        if (mode !== "meihua" && mode !== "dual") selectedGuaCastMethod = "time";
        els.modeCards.forEach((button) => {
          const isSelected = button.dataset.modeCard === mode;
          button.classList.toggle("is-selected", isSelected);
          button.setAttribute("aria-pressed", String(isSelected));
        });
        els.room.dataset.tone = nextToneForMode(mode);
        els.composePanel.dataset.mode = mode;
        els.signalRow.dataset.mode = mode;
        resetExperience();
        syncRailNav();
        els.input.disabled = false;
        updateModeHint();
        updateModeLabel();
        updateQuestionCopy();
        updateSignalCopy();
        updatePlaceholderSample(true);
        updateDailyModeState();
        updateSpreadSelector();
        updateGuaCastSelector();
        updateCastCopy();
      }

      function updateModeLabel() {
        els.modeLabel.textContent = t(modeConfig().label);
      }

      function updateModeHint() {
        els.hint.textContent = t(modeConfig().hint);
      }

      function updateQuestionCopy() {
        const config = modeConfig();
        els.questionLabel.textContent = t(config.question);
        els.modePrimer.textContent = t(config.primer);
        els.input.placeholder = t(config.placeholder);
      }

      function placeholderKeysForMode() {
        if (mode === "dual") return ["questionPlaceholderDual", "questionPlaceholderDualAlt1", "questionPlaceholderDualAlt2"];
        if (mode === "tarot") return ["questionPlaceholder", "questionPlaceholderAlt1", "questionPlaceholderAlt2"];
        return [mode === "meihua" ? "questionPlaceholderMeihua" : "questionPlaceholderDaily"];
      }

      function updatePlaceholderSample(reset = false) {
        const keys = placeholderKeysForMode();
        if (reset) placeholderIndex = 0;
        els.input.placeholder = t(keys[placeholderIndex % keys.length]);
      }

      function shouldOfferQuestionAssist(question) {
        const text = cleanText(question, "");
        if (mode !== "tarot" && mode !== "dual") return false;
        if (text.length < 6) return true;
        if (lang === "zh") return /会不会|能不能|是不是|到底|什么时候|结果|复合|喜欢我|还爱|一定/.test(text);
        return /\b(will|should i wait|does .* like me|when will|for sure|happen)\b/i.test(text);
      }

      function updateDailyModeState() {
        const isDaily = mode === "daily";
        els.composePanel.classList.toggle("is-daily", isDaily);
        els.answerPanel.classList.toggle("is-daily-note", isDaily);
        prepareDailyCompose();
      }

      function prepareDailyCompose() {
        const isDaily = mode === "daily";
        els.input.hidden = isDaily;
        els.questionExamples.hidden = els.input.hidden;
        els.spreadSelector.hidden = mode !== "tarot";
        els.guaCastSelector.hidden = mode !== "meihua" && mode !== "dual";
        els.guaComposeMark.hidden = mode !== "meihua";
      }

      function updateCastCopy() {
        if (isRunning) return;
        els.cast.textContent = t(modeConfig().cast);
      }

      function setResultLabels(sourceMode) {
        const tarotLabels = sourceMode === "dual"
          ? ["reportTarotLabel", "reportGuaLabel", "reportDualLabel"]
          : ["reflectionSeenLabel", "reflectionHiddenLabel", "reflectionVerifyLabel"];
        const meihuaLabels = ["guaShowsLabel", "guaTrendLabel", "guaAdviceLabel"];
        const labels = sourceMode === "meihua" ? meihuaLabels : tarotLabels;
        [
          [els.tarotReadingGrid, labels],
          [els.reportStack, labels]
        ].forEach(([container, keys]) => {
          Array.from(container.querySelectorAll("span")).forEach((node, index) => {
            if (keys[index]) node.textContent = t(keys[index]);
          });
        });
        els.actionBoardTitle.textContent = t("nextStepHeading");
        els.newReading.textContent = t(
          sourceMode === "meihua" ? "newReadingMeihua" : sourceMode === "dual" ? "newReadingDual" : "newReadingTarot"
        );
        els.save.textContent = t(lastRecord ? "savedHistory" : "saveHistory");
      }

      function hideTarotReading() {
        els.tarotReadingGrid.hidden = true;
        els.tarotReadingGrid.classList.remove("is-revealed");
        els.tarotCoreQuestion.textContent = "";
        els.tarotTension.textContent = "";
        els.tarotJudgment.textContent = "";
      }

      function showTarotReading(parts) {
        const coreQuestion = cleanText(parts.cardMessage || parts.coreQuestion || parts.CORE_QUESTION, "");
        const tension = cleanText(parts.stuckText || parts.tension || parts.TENSION, "");
        const judgment = cleanText(parts.judgment, "");
        els.tarotCoreQuestion.textContent = coreQuestion;
        els.tarotTension.textContent = tension;
        els.tarotJudgment.textContent = judgment;
        els.tarotReadingGrid.hidden = !(coreQuestion || tension || judgment);
        if (!els.tarotReadingGrid.hidden) {
          requestAnimationFrame(() => els.tarotReadingGrid.classList.add("is-revealed"));
        }
      }

      function showReflectionCardImage(card) {
        if (!card) return;
        els.cardImage.onerror = () => {
          if (els.cardImage.dataset.fallbackApplied === "true" || !card.imageFallbackSrc) return;
          els.cardImage.dataset.fallbackApplied = "true";
          els.cardImage.src = card.imageFallbackSrc;
        };
        els.cardImage.dataset.fallbackApplied = "false";
        els.cardImage.src = card.imageSrc;
        els.cardImage.alt = card.imageAlt;
        els.tarotSymbol.dataset.cardCategory = card.category || "";
      }

      function hideReport() {
        els.answerPanel.classList.remove("is-dual-report");
        els.coreConclusion.hidden = false;
        els.resultSummary.textContent = "";
        els.resultSummary.hidden = false;
        els.resultSummaryLabel.hidden = false;
        els.action.textContent = "";
        els.action.hidden = true;
        els.actionSentenceLabel.hidden = true;
        els.reportStack.hidden = true;
        els.reportStack.classList.remove("is-revealed");
        els.reportTarot.textContent = "";
        els.reportGua.textContent = "";
        els.reportDual.textContent = "";
        els.actionBoard.hidden = true;
        els.actionBoard.classList.remove("is-revealed");
        els.actionBoardTitle.hidden = true;
        els.actionStatus.hidden = true;
        els.actionStatus.querySelectorAll("[data-action-status]").forEach((button) => button.classList.remove("is-selected"));
        els.reviewBox.hidden = true;
        els.reviewStatus.textContent = "";
        els.reviewNoteInput.value = "";
        els.sharePanel.hidden = true;
        els.shareIncludeQuestion.checked = false;
        currentShareLink = null;
        currentResonanceSubmission = null;
        updateShareLinkUi();
        els.copyFallbackText.hidden = true;
        els.copyFallbackText.value = "";
        els.actionDo.textContent = "";
        els.actionDont.textContent = "";
        els.actionWatch.textContent = "";
        els.actionDont.parentElement.hidden = false;
        els.actionWatch.parentElement.hidden = false;
        els.followupChips.hidden = true;
        els.followupPanel.hidden = true;
        els.followupAnswer.hidden = true;
        els.followupAnswerText.textContent = "";
        els.followupEntryList.innerHTML = "";
        selectedFollowupKind = "";
        updateFollowupSubmit();
      }

      function actionAdvice(actionText, extras = {}) {
        return buildActionAdvice(actionText, { language: lang, ...extras });
      }

      function guaDescription(gua) {
        return describeGua(gua, { language: lang });
      }

      function renderStructuredReport(data) {
        els.answerPanel.classList.toggle("is-dual-report", data.sourceMode === "dual");
        const tarotText = cleanText(data.tarotText, "");
        const guaText = cleanText(data.guaText, "");
        const dualText = cleanText(data.dualText, "");
        const summary = cleanText(
          data.summary || tarotText || guaText || dualText,
          lang === "zh" ? "这次结果更像是在提醒你：先看清手里已有的信号，再决定是否推进。" : "This reading points to a pause: see the available signals clearly before moving forward."
        );
        const compactText = (value) => cleanText(value, "").replace(/\s+/g, "");
        const summaryKey = compactText(summary);
        const duplicateSummary = Boolean(summaryKey) && [
          tarotText,
          guaText,
          dualText,
          els.tarotCoreQuestion.textContent,
          els.tarotTension.textContent,
          els.tarotJudgment.textContent
        ].some((text) => compactText(text) === summaryKey);
        els.reportTarot.textContent = tarotText;
        els.reportGua.textContent = guaText;
        els.reportDual.textContent = dualText;
        els.reportTarotSection.hidden = !tarotText;
        els.reportGuaSection.hidden = !guaText;
        els.reportDualSection.hidden = !dualText;
        setResultLabels(data.sourceMode);
        const shouldShowReportStack = data.sourceMode === "meihua" || data.sourceMode === "dual";
        const hasReportSection = Boolean(tarotText || guaText || dualText);
        els.reportStack.hidden = !(shouldShowReportStack && hasReportSection);
        const hasDetailedReport = !els.tarotReadingGrid.hidden || !els.reportStack.hidden;
        const showSummary = !duplicateSummary && !hasDetailedReport;
        els.resultSummary.textContent = showSummary ? summary : "";
        els.resultSummary.hidden = !showSummary;
        els.resultSummaryLabel.hidden = !showSummary;

        const generatedDontText = cleanText(data.dontText, "");
        const generatedWatchText = cleanText(data.watchText, "");
        const questionText = cleanText(data.questionText || lastQuestion, "");
        const hasContextualFallback = hasContextualActionAdvice(questionText);
        const advice = actionAdvice(data.actionText, {
          dontText: generatedDontText,
          watchText: generatedWatchText,
          questionText
        });
        els.actionDo.textContent = advice.doText;
        els.actionDont.textContent = generatedDontText || hasContextualFallback ? advice.dontText : "";
        els.actionWatch.textContent = generatedWatchText || hasContextualFallback ? advice.watchText : "";
        els.actionDont.parentElement.hidden = !(generatedDontText || hasContextualFallback);
        els.actionWatch.parentElement.hidden = !(generatedWatchText || hasContextualFallback);
        lastAction = cleanText(data.actionText, "") || advice.doText;
        const showTopAction = false;
        els.action.textContent = showTopAction ? lastAction : "";
        els.action.hidden = !showTopAction || !lastAction;
        els.actionSentenceLabel.hidden = !showTopAction || !lastAction;
        els.coreConclusion.hidden = els.resultSummary.hidden && els.action.hidden;
        els.actionBoard.hidden = false;
        els.actionBoardTitle.hidden = false;
        els.actionStatus.hidden = false;
        els.sharePanel.hidden = false;
        updateActionStatusUi(lastRecord?.actionStatus || "");
        els.followupChips.hidden = data.sourceMode === "meihua" || data.sourceMode === "daily";
        els.followupPanel.hidden = true;
        currentResultContext = {
          sourceMode: data.sourceMode,
          summary,
          tarotText,
          guaText,
          dualText,
          actionText: lastAction,
          doText: advice.doText,
          dontText: generatedDontText || hasContextualFallback ? advice.dontText : "",
          watchText: generatedWatchText || hasContextualFallback ? advice.watchText : "",
          questionText
        };

        requestAnimationFrame(() => {
          if (!els.reportStack.hidden) els.reportStack.classList.add("is-revealed");
          els.actionBoard.classList.add("is-revealed");
        });
      }

      function reportFromRecord(record) {
        return normalizeReportFromRecord(record, { language: lang });
      }

      function actionFromRecord(record) {
        return actionFromResultRecord(record);
      }

      function cardKeywords(cardName) {
        const card = reflectionDeck.find((item) => [
          item.imageNameZh,
          item.imageNameEn,
          item.imageAltZh,
          item.imageAltEn
        ].includes(cardName));
        if (!card) return [];
        const category = lang === "zh"
          ? { state: "状态", relation: "关系", movement: "动势" }[card.category]
          : { state: "State", relation: "Relation", movement: "Movement" }[card.category];
        const meaning = lang === "zh" ? card.coreMeaningZh : card.coreMeaningEn;
        return [category, meaning].filter(Boolean);
      }

      function renderSymbolSpread(cards = []) {
        const spreadCards = Array.isArray(cards) ? cards.filter(Boolean) : [];
        els.symbolSpreadList.innerHTML = "";
        if (spreadCards.length <= 1) {
          els.symbolSpreadList.hidden = true;
          return;
        }
        spreadCards.forEach((card, index) => {
          const item = document.createElement("div");
          const image = document.createElement("img");
          const copy = document.createElement("div");
          const label = document.createElement("span");
          const name = document.createElement("strong");
          const keywords = document.createElement("em");
          image.src = card.imageSrc || "";
          image.alt = cleanText(card.imageAlt || card.name, "");
          label.textContent = cleanText(card.label || card.position || `${index + 1}`, "");
          name.textContent = cleanText(card.imageAlt || card.name, "");
          keywords.textContent = cardKeywords(card.name || card.imageAlt).slice(0, 3).join(" / ");
          copy.append(label, name, keywords);
          item.append(image, copy);
          els.symbolSpreadList.appendChild(item);
        });
        els.symbolSpreadList.hidden = false;
      }

      function updateSymbolSummary({ sourceMode = mode, name = "", question = "", cards = [] } = {}) {
        const modeLabel = sourceMode === "meihua" ? t("modeMeihua") : sourceMode === "dual" ? t("modeDual") : t("modeTarot");
        const safeName = cleanText(name || els.cardImage?.alt || els.answerKicker?.textContent, modeLabel);
        const safeQuestion = cleanText(question || lastQuestion, "");
        els.symbolModeLabel.textContent = modeLabel;
        els.symbolNameLabel.textContent = safeName;
        els.symbolKeywords.innerHTML = "";
        const keywords = sourceMode === "meihua"
          ? (lang === "zh" ? ["时机", "趋势", "推进", "观察"] : ["Timing", "Trend", "Move", "Observe"])
          : cardKeywords(safeName);
        keywords.forEach((keyword) => {
          const item = document.createElement("span");
          item.textContent = keyword;
          els.symbolKeywords.appendChild(item);
        });
        els.symbolKeywords.hidden = keywords.length === 0;
        renderSymbolSpread(sourceMode === "meihua" ? [] : cards);
        els.symbolQuestionText.textContent = safeQuestion;
        els.symbolQuestion.hidden = !safeQuestion;
      }

      function updateRitualCardLabels() {
        els.ritualCards.forEach((cardButton) => {
          const card = reflectionDeck[Number(cardButton.dataset.cardIndex)];
          if (!card) return;
          const position = Number(cardButton.dataset.cardIndex) + 1;
          cardButton.setAttribute("aria-label", lang === "zh" ? `选择第 ${position} 张牌` : `Choose card ${position}`);
          cardButton.title = "";
        });
      }

      function buildRitualDeck() {
        if (!els.ritualDeck) return;
        els.ritualDeck.innerHTML = "";
        reflectionDeck.forEach((card, deckIndex) => {
          const cardButton = document.createElement("button");
          const layout = ritualCardLayout(deckIndex, reflectionDeck.length);
          cardButton.className = "ritual-card";
          cardButton.type = "button";
          cardButton.disabled = true;
          cardButton.dataset.cardIndex = String(deckIndex);
          cardButton.style.setProperty("--card-index", layout.cardIndex);
          cardButton.style.setProperty("--card-mid", layout.cardMid);
          cardButton.style.setProperty("--card-x", layout.cardX);
          cardButton.style.setProperty("--card-y", layout.cardY);
          cardButton.style.setProperty("--card-angle", layout.cardAngle);
          cardButton.style.setProperty("--card-depth", layout.cardDepth);
          cardButton.style.setProperty("--card-scale", layout.cardScale);
          cardButton.style.setProperty("--card-opacity", layout.cardOpacity);
          cardButton.style.setProperty("--card-pull-x", layout.cardPullX);
          cardButton.style.setProperty("--card-pull-y", layout.cardPullY);
          cardButton.style.setProperty("--card-select-x", layout.cardSelectX);
          cardButton.style.setProperty("--card-select-y", layout.cardSelectY);
          cardButton.style.setProperty("--shuffle-x", layout.shuffleX);
          cardButton.style.setProperty("--shuffle-y", layout.shuffleY);
          cardButton.style.setProperty("--cut-x", layout.cutX);
          cardButton.style.setProperty("--cut-y", layout.cutY);
          cardButton.style.setProperty("--spread-z", layout.spreadZ);
          cardButton.style.setProperty("--delay", layout.delay);
          cardButton.innerHTML = `
            <span class="ritual-card-3d" aria-hidden="true">
              <span class="ritual-card-back"></span>
              <span class="ritual-card-face"></span>
            </span>`;
          els.ritualDeck.appendChild(cardButton);
        });
        els.ritualCards = Array.from(els.ritualDeck.querySelectorAll(".ritual-card"));
        updateRitualCardLabels();
      }

      function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      function ritualDelay(ms) {
        return matchMedia("(prefers-reduced-motion: reduce)").matches ? delay(Math.min(ms, 80)) : delay(ms);
      }

      function setRitualStep(index) {
        if (!els.ritualStepper) return;
        els.ritualStepper.dataset.activeStep = String(index);
        Array.from(els.ritualStepper.children).forEach((step, stepIndex) => {
          step.classList.toggle("is-active", stepIndex === index);
          step.classList.toggle("is-complete", stepIndex < index);
        });
      }

      function setRitualStatus(key) {
        currentRitualStatusKey = key;
        if (els.ritualStatus) els.ritualStatus.textContent = t(key);
        if (els.ritualHeading) els.ritualHeading.textContent = t(key);
      }

      function showBrandLoading(nextMode = mode) {
        if (!els.brandLoading) return;
        brandLoadingStartedAt = performance.now();
        if (els.brandLoadingText) els.brandLoadingText.textContent = t(modeConfig(nextMode).generating);
        els.brandLoading.hidden = false;
        els.brandLoading.classList.remove("is-playing");
        void els.brandLoading.offsetWidth;
        requestAnimationFrame(() => els.brandLoading.classList.add("is-playing"));
      }

      async function waitForBrandLoading(minimumMs = 1500) {
        if (!els.brandLoading || els.brandLoading.hidden || !brandLoadingStartedAt) return;
        const returningMinimum = isSystemV1 && loadHistory(recordStore).length ? Math.min(minimumMs, 600) : minimumMs;
        const remaining = returningMinimum - (performance.now() - brandLoadingStartedAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      function hideBrandLoading() {
        if (!els.brandLoading) return;
        els.brandLoading.hidden = true;
        els.brandLoading.classList.remove("is-playing");
        brandLoadingStartedAt = 0;
      }

      function setNavigationLocked(locked) {
        els.modeBtns.forEach((button) => {
          button.disabled = locked;
        });
        els.reset.disabled = locked;
      }

      function setSignalPhase(index) {
        els.signalRow.classList.remove("phase-1", "phase-2", "phase-3");
        if (index > 0) els.signalRow.classList.add(`phase-${index}`);
      }

      function resetCardChoice() {
        els.ritualStage?.classList.remove("is-awaiting-card", "is-previewing", "has-choice", "is-selected", "is-revealing-card");
        if (els.ritualPreviewActions) els.ritualPreviewActions.hidden = true;
        els.ritualCards.forEach((card) => {
          card.classList.remove("is-chosen", "is-dimmed");
          card.disabled = true;
        });
      }

      function waitForCardChoice(position = { key: "single", category: null, label: "" }, excludedIndexes = []) {
        const positionLabel = position.label || "";
        if (positionLabel) {
          currentRitualStatusKey = "ritualChooseCard";
          els.ritualStatus.textContent = `${t("ritualChoosePosition")}${positionLabel}`;
          els.ritualHeading.textContent = `${t("ritualChoosePosition")}${positionLabel}`;
        } else {
          setRitualStatus("ritualChooseCard");
        }
        setRitualStep(1);
        els.ritualStage.classList.add("is-awaiting-card");
        els.ritualClose.disabled = false;
        els.ritualCards.forEach((card) => {
          card.disabled = excludedIndexes.includes(Number(card.dataset.cardIndex));
          card.classList.toggle("is-dimmed", card.disabled);
        });
        return new Promise((resolve, reject) => {
          let selectedCard = null;
          const clearListeners = () => {
            els.ritualCards.forEach((card) => card.removeEventListener("click", choose));
            els.ritualConfirm.removeEventListener("click", confirmChoice);
            els.ritualReselect.removeEventListener("click", reselect);
            window.removeEventListener("keydown", handleKeydown);
            activeRitualCancel = null;
          };
          const cancelChoice = () => {
            clearListeners();
            const error = new Error("Ritual cancelled");
            error.name = "RitualCancelled";
            reject(error);
          };
          const choose = (event) => {
            selectedCard = event.currentTarget;
            const index = Number(selectedCard.dataset.cardIndex);
            const selected = reflectionCardForSelection({ index, position });
            const selectedFace = selectedCard.querySelector(".ritual-card-face");
            if (selected && selectedFace) {
              selectedFace.style.backgroundImage = `url("${selected.imageSrc}")`;
            }
            els.ritualCards.forEach((card) => {
              card.removeEventListener("click", choose);
              card.disabled = true;
              if (card !== selectedCard) card.classList.add("is-dimmed");
            });
            selectedCard.classList.add("is-chosen");
            selectedCard.disabled = false;
            selectedCard.focus();
            els.ritualStage.classList.add("has-choice", "is-previewing");
            els.ritualStage.classList.remove("is-awaiting-card");
            els.ritualPreviewActions.hidden = false;
            setRitualStatus("ritualSelect");
          };
          const confirmChoice = () => {
            if (!selectedCard) return;
            const index = Number(selectedCard.dataset.cardIndex);
            const selected = reflectionDeck[index];
            if (!selected) {
              clearListeners();
              reject(new Error("Missing selected card"));
              return;
            }
            clearListeners();
            els.ritualPreviewActions.hidden = true;
            selectedCard.disabled = true;
            resolve({ index });
          };
          const reselect = () => {
            selectedCard = null;
            resetCardChoice();
            els.ritualStage.classList.add("is-spread", "is-awaiting-card");
            if (positionLabel) {
              els.ritualStatus.textContent = `${t("ritualChoosePosition")}${positionLabel}`;
              els.ritualHeading.textContent = `${t("ritualChoosePosition")}${positionLabel}`;
            } else {
              setRitualStatus("ritualChooseCard");
            }
            els.ritualCards.forEach((card) => {
              card.disabled = excludedIndexes.includes(Number(card.dataset.cardIndex));
              card.classList.toggle("is-dimmed", card.disabled);
              if (!card.disabled) card.addEventListener("click", choose);
            });
            els.ritualCards[Math.floor(els.ritualCards.length / 2)]?.focus();
          };
          const handleKeydown = (event) => {
            if (event.key === "Escape" && selectedCard) reselect();
          };
          els.ritualCards.forEach((card) => {
            if (!card.disabled) card.addEventListener("click", choose);
          });
          els.ritualConfirm.addEventListener("click", confirmChoice);
          els.ritualReselect.addEventListener("click", reselect);
          window.addEventListener("keydown", handleKeydown);
          activeRitualCancel = cancelChoice;
          els.ritualCards[Math.floor(els.ritualCards.length / 2)]?.focus();
        });
      }

      async function playRitual(nextMode) {
        if (!els.ritualStage) return null;
        els.composePanel.classList.add("is-ritual-active");
        els.ritualStage.hidden = false;
        els.ritualStage.dataset.ritual = nextMode === "meihua" ? "gua" : nextMode === "dual" ? "dual" : "card";
        els.ritualStage.className = "ritual-stage";
        els.ritualClose.disabled = true;
        resetCardChoice();
        els.ritualGuaLines.forEach((line) => line.classList.remove("is-drawn"));
        setSignalPhase(1);
        let selectedCards = [];

        if (nextMode === "tarot" || nextMode === "dual") {
          const spreadType = ritualSpreadTypeForMode(nextMode, selectedSpreadType);
          const positions = spreadPositions(spreadType);
          const excludedIndexes = [];
          setRitualStatus("ritualShuffle");
          setRitualStep(0);
          await ritualDelay(300);
          els.ritualStage.classList.add("is-shuffling");
          await ritualDelay(900);
          els.ritualStage.classList.add("is-cutting");
          await ritualDelay(600);
          setRitualStatus("ritualSpread");
          els.ritualStage.classList.add("is-spread");
          await ritualDelay(1000);
          for (const position of positions) {
            const selection = await waitForCardChoice(position, excludedIndexes);
            excludedIndexes.push(selection.index);
            selectedCards.push({ ...selection, position });
            resetCardChoice();
            els.ritualStage.classList.add("is-spread");
          }
          setRitualStatus("ritualRevealingCard");
          setRitualStep(2);
          els.ritualStage.classList.add("is-selected", "is-revealing-card");
          await ritualDelay(300);
          els.ritualStage.classList.add("is-flipped");
          await ritualDelay(900);
        } else {
          setRitualStatus("ritualGuaMoment");
          await ritualDelay(220);
        }

        if (nextMode === "meihua" || nextMode === "dual") {
          setSignalPhase(2);
          setRitualStep(2);
          setRitualStatus("ritualGua");
          els.ritualStage.classList.add("is-gua-drawing");
          for (const line of els.ritualGuaLines) {
            line.classList.add("is-drawn");
            await ritualDelay(115);
          }
        }

        setSignalPhase(3);
        setRitualStep(3);
        setRitualStatus(nextMode === "dual" ? "ritualSummarize" : "ritualAi");
        els.ritualStage.classList.add("is-revealing");
        await ritualDelay(500);
        return selectedCards.length ? { spreadType: ritualSpreadTypeForMode(nextMode, selectedSpreadType), cards: selectedCards } : null;
      }

      function hideRitual() {
        if (!els.ritualStage) return;
        els.ritualStage.hidden = true;
        els.ritualStage.className = "ritual-stage";
        els.ritualClose.disabled = true;
        els.composePanel.classList.remove("is-ritual-active");
        els.ritualStage.removeAttribute("data-ritual");
        setRitualStatus("ritualIdle");
        setRitualStep(0);
        setSignalPhase(0);
        resetCardChoice();
      }

      function renderGua(binary) {
        els.guaSymbol.innerHTML = "";
        const rawBinary = String(binary || "");
        const safeBinary = /^[01]{6}$/.test(rawBinary)
          ? rawBinary
          : /^[01]{3}$/.test(rawBinary)
            ? rawBinary + rawBinary
            : "111111";
        [...safeBinary].reverse().forEach((line) => {
          const row = document.createElement("div");
          row.className = "gua-line " + (line === "1" ? "yang" : "yin");
          row.appendChild(document.createElement("span"));
          if (line !== "1") row.appendChild(document.createElement("span"));
          els.guaSymbol.appendChild(row);
        });
        requestAnimationFrame(() => {
          els.guaSymbol.querySelectorAll(".gua-line").forEach((line, index) => {
            line.style.setProperty("--line-index", index);
            line.classList.add("is-drawn");
          });
        });
      }

      function parseTokens(text) {
        const out = {};
        const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
        let current = null;
        for (const line of lines) {
          const match = line.match(/^\s*\[([A-Z0-9_]+)\]\s*(.*)$/);
          if (match) {
            current = match[1];
            out[current] = match[2] ? match[2].trim() : "";
          } else if (current) {
            out[current] = [out[current], line].filter(Boolean).join("\n").trim();
          }
        }
        return out;
      }

      async function streamReading(payload, onText) {
        return readingClient.stream(payload, onText);
      }

      async function clarifyQuestion(originalQuestion) {
        const full = await streamReading({
          mode: "clarify",
          tier: "basic",
          entry: mode === "dual" ? "dual" : "tarot",
          question: originalQuestion,
          round: 1,
          language: lang
        }, () => {});
        const tokens = parseTaggedTokens(full);
        return {
          clarifiedQuestion: cleanText(tokens.CLARIFIED_QUESTION || tokens.clarifiedQuestion || "", originalQuestion),
          note: cleanTaggedOutputText(tokens.CLARIFY_NOTE || tokens.clarifyNote || "", t("questionAssistFallbackNote"))
        };
      }

      function hideQuestionAssist() {
        if (!els.questionAssist) return;
        els.questionAssist.hidden = true;
        els.questionAssist.classList.remove("support-state", "professional-boundary-state");
        els.questionAssistAccept.hidden = false;
        els.questionAssistOriginal.hidden = false;
        els.questionAssistAccept.onclick = null;
        els.questionAssistOriginal.onclick = null;
        els.questionAssistAccept.disabled = false;
        els.questionAssistOriginal.disabled = false;
      }

      function submitQuestionWithDetail(detail) {
        els.form.dispatchEvent(new CustomEvent("submit", { cancelable: true, detail }));
      }

      async function showQuestionAssist(originalQuestion) {
        let skipped = false;
        const continueOriginal = () => {
          if (skipped) return;
          skipped = true;
          els.input.value = originalQuestion;
          hideQuestionAssist();
          submitQuestionWithDetail({ question: originalQuestion, skipQuestionAssist: true });
        };

        els.questionAssist.hidden = false;
        els.questionAssistAccept.hidden = false;
        els.questionAssistOriginal.hidden = false;
        els.questionAssistNote.textContent = t("questionAssistWorking");
        els.questionAssistAccept.disabled = true;
        els.questionAssistOriginal.disabled = false;
        els.questionAssistOriginal.onclick = continueOriginal;
        els.cast.disabled = true;
        els.cast.classList.add("is-loading");
        els.cast.textContent = t("questionAssistWorking");

        try {
          const result = await clarifyQuestion(originalQuestion);
          if (skipped) return;
          const clarifiedQuestion = result.clarifiedQuestion || originalQuestion;
          els.input.value = clarifiedQuestion;
          els.questionAssistNote.textContent = result.note || t("questionAssistFallbackNote");
          els.questionAssistAccept.disabled = false;
          els.questionAssistOriginal.disabled = false;
          els.questionAssistAccept.onclick = () => {
            hideQuestionAssist();
            submitQuestionWithDetail({ question: clarifiedQuestion, skipQuestionAssist: true });
          };
          els.questionAssistOriginal.onclick = continueOriginal;
        } catch (error) {
          console.warn("Question assist unavailable", error);
          if (!skipped) {
            els.input.value = originalQuestion;
            hideQuestionAssist();
            queueMicrotask(() => submitQuestionWithDetail({ question: originalQuestion, skipQuestionAssist: true }));
          }
        } finally {
          if (!skipped) {
            els.cast.disabled = false;
            els.cast.classList.remove("is-loading");
            updateCastCopy();
          }
        }
      }

      function showSafetyNotice(safetyRoute) {
        els.questionAssist.hidden = false;
        els.questionAssist.classList.toggle("support-state", safetyRoute.route === "support");
        els.questionAssist.classList.toggle("professional-boundary-state", safetyRoute.route !== "support");
        els.questionAssistNote.textContent = t(safetyRoute.route === "support" ? "safetySupport" : "safetyProfessional");
        els.questionAssistAccept.hidden = true;
        els.questionAssistOriginal.hidden = true;
        els.questionAssist.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      function showResult() {
        els.room.dataset.step = "answer";
        syncRailNav();
      }

      function resetExperience() {
        closeCardLightbox();
        hideRitual();
        hideBrandLoading();
        els.room.dataset.step = "idle";
        syncRailNav();
        els.loading.hidden = true;
        els.action.hidden = true;
        els.action.textContent = "";
        els.action.classList.remove("is-typing");
        els.anchorGrid.hidden = true;
        els.dailyNoteStatus.hidden = true;
        hideTarotReading();
        hideReport();
        hideQuestionAssist();
        els.copy.textContent = t("copy");
        els.copySummary.textContent = t("copySummary");
        els.copyFull.textContent = t("copyFull");
        els.shareImage.textContent = t("shareImage");
        els.exportPdf.textContent = t("exportPdf");
        updateSymbolSummary({ sourceMode: mode, name: t("modeTarot"), question: "", cards: [] });
        lastAction = "";
        lastQuestion = "";
        lastRecord = null;
        currentResultContext = null;
        pendingClarificationContext = null;
      }

      function openCardLightbox() {
        if (els.tarotSymbol.hidden || !els.cardImage.currentSrc) return;
        els.lightboxImage.src = els.cardImage.currentSrc;
        els.lightboxImage.alt = els.cardImage.alt;
        els.lightboxCaption.textContent = els.cardImage.alt;
        els.lightbox.hidden = false;
        els.lightbox.setAttribute("aria-hidden", "false");
        els.lightboxClose.focus();
      }

      function closeCardLightbox() {
        if (!els.lightbox || els.lightbox.hidden) return;
        els.lightbox.hidden = true;
        els.lightbox.setAttribute("aria-hidden", "true");
      }

      function createRecord(data) {
        const createdAt = new Date().toISOString();
        return {
          id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `askaura-${Date.now()}`,
          createdAt,
          updatedAt: createdAt,
          reviewAt: reviewDateAfter(createdAt),
          language: lang,
          ...data
        };
      }

      function recordCardFromSelection(selection) {
        return buildRecordCardFromSelection(selection, {
          language: lang,
          singleLabel: t("spreadSingle")
        });
      }

      function primaryCardFromRecordCards(cards = []) {
        return selectPrimaryCardFromRecordCards(cards);
      }

      function saveResultRecord(data) {
        const baseRecord = createRecord({
          ...data,
          title: data.mode === "daily" ? cleanText(data.title, "") : normalizedTitleText(data),
        });
        const record = isSystemV1 && baseRecord.mode !== "daily"
          ? createTemporaryResult(baseRecord)
          : baseRecord;
        saveHistoryRecord(recordStore, record);
        if (record.mode === "daily") saveDailyAnchor(recordStore, todayKey(), record);
        syncAfterSave(record);
        renderHistoryList();
        lastRecord = record;
        currentShareLink = null;
        currentResonanceSubmission = null;
        updateShareLinkUi();
        updateResonanceUi();
        updateActionStatusUi(record.actionStatus || "");
        updateReviewUi(record);
        if (els.save) els.save.textContent = t("savedHistory");
        if (isSystemV1 && record.mode !== "daily") {
          renderResultWorkflow(els, record, { language: lang });
          setSuccessfulResultActions(els, true);
        }
        return record;
      }

      function persistJourneyRecord(record) {
        saveHistoryRecord(recordStore, record);
        syncAfterSave(record);
        renderHistoryList();
        lastRecord = record;
        if (isSystemV1) renderResultWorkflow(els, record, { language: lang });
        return record;
      }

      function handleResultWorkflow(event) {
        const action = event.target.closest("[data-result-action]")?.dataset.resultAction;
        if (!action || !lastRecord) return;
        try {
          if (action === "confirm-insight") {
            const record = persistJourneyRecord(confirmResultInsight(lastRecord, els.insightInput.value));
            productEvents.emit("insight_confirmed", { mode: record.mode, lifecycleState: record.lifecycleState });
          } else if (action === "accept-action") {
            const record = persistJourneyRecord(confirmResultAction(lastRecord, {
              action: els.actionInput.value,
              actionTheme: els.actionThemeInput.value
            }));
            productEvents.emit("action_confirmed", { mode: record.mode, lifecycleState: record.lifecycleState });
          } else if (action === "edit-action") {
            els.actionInput.focus();
            els.actionInput.select();
          } else if (action === "save-observation") {
            persistJourneyRecord(saveResultObservation(lastRecord));
          } else if (action === "leave-temporary") {
            resetExperience();
            renderAdaptiveHome();
          }
        } catch (error) {
          els.resultWorkflowStatus.textContent = error.message === "insight_required"
            ? "请先确认一个属于你的洞见。"
            : "请保留一个具体、可执行的下一步。";
        }
      }

      function handleFailureAction(event) {
        const action = event.target.closest("[data-failure-action]")?.dataset.failureAction;
        if (!action) return;
        if (action === "retry") {
          els.form.requestSubmit();
        } else if (action === "later") {
          resetExperience();
          renderAdaptiveHome();
        } else if (action === "edit-question") {
          els.room.dataset.step = "compose";
          els.composePanel.hidden = false;
          setTimeout(() => els.input.focus(), 60);
        } else if (action === "save-symbol") {
          const base = createRecord({
            mode,
            title: els.answerKicker.textContent || t("answerTitle"),
            question: lastQuestion,
            answer: "",
            action: "",
            imageSrc: els.cardImage?.getAttribute("src") || "",
            imageAlt: els.cardImage?.alt || ""
          });
          const record = createTemporaryResult(base);
          saveHistoryRecord(recordStore, record);
          lastRecord = record;
          renderHistoryList();
          resetExperience();
          renderAdaptiveHome();
        }
      }

      function saveFollowupToCurrentRecord(question, answer) {
        if (!lastRecord) return null;
        const followup = createFollowupEntry({
          question,
          answer,
          sourceResultId: lastRecord.id
        });
        const record = appendFollowupToRecord(lastRecord, followup);
        saveHistoryRecord(recordStore, record);
        syncAfterSave(record);
        renderHistoryList();
        lastRecord = record;
        return followup;
      }

      function updateActionStatusUi(status = "") {
        if (!els.actionStatus) return;
        els.actionStatus.querySelectorAll("[data-action-status]").forEach((button) => {
          button.classList.toggle("is-selected", button.dataset.actionStatus === status);
        });
      }

      function saveActionStatus(status) {
        if (!lastRecord) return;
        const updatedAt = new Date().toISOString();
        const record = {
          ...lastRecord,
          actionStatus: status,
          updatedAt
        };
        saveHistoryRecord(recordStore, record);
        syncAfterSave(record);
        renderHistoryList();
        lastRecord = record;
        updateActionStatusUi(status);
        updateReviewUi(record);
      }

      function reviewDateAfter(value, days = 3) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        date.setDate(date.getDate() + days);
        return date.toISOString();
      }

      function isReviewDue(record, now = new Date()) {
        const time = Date.parse(record?.reviewAt || "");
        return Number.isFinite(time) && time <= now.getTime();
      }

      function updateReviewUi(record = lastRecord) {
        if (!els.reviewBox) return;
        const shouldShow = Boolean(record?.reviewNote) || isReviewDue(record);
        els.reviewBox.hidden = !shouldShow;
        if (!shouldShow) {
          els.reviewStatus.textContent = "";
          els.reviewNoteInput.value = "";
          return;
        }
        els.reviewStatus.textContent = record.reviewNote ? t("reviewSaved") : t("reviewDue");
        els.reviewNoteInput.value = record.reviewNote || "";
      }

      function saveReviewNote() {
        if (!lastRecord) return;
        const note = cleanText(els.reviewNoteInput.value, "");
        const updatedAt = new Date().toISOString();
        const record = {
          ...lastRecord,
          reviewNote: note,
          updatedAt
        };
        saveHistoryRecord(recordStore, record);
        syncAfterSave(record);
        renderHistoryList();
        lastRecord = record;
        updateReviewUi(record);
      }

      function renderStoredFollowups(record) {
        const followups = Array.isArray(record?.followups) ? record.followups : [];
        els.followupEntryList.innerHTML = "";
        if (!followups.length) return;
        els.followupAnswerText.textContent = "";
        followups.forEach((item) => {
          const question = cleanText(item.question, "");
          const answer = cleanTaggedOutputText(item.answer, "", { joinWith: "\n" });
          if (!question && !answer) return;
          const entry = document.createElement("article");
          entry.className = "followup-entry";
          const meta = document.createElement("span");
          meta.textContent = formatDate(item.createdAt);
          const title = document.createElement("strong");
          title.textContent = question;
          const body = document.createElement("p");
          body.textContent = answer;
          const copy = document.createElement("button");
          copy.type = "button";
          copy.className = "secondary muted";
          copy.dataset.followupCopy = item.id || "";
          copy.textContent = t("followupCopy");
          entry.append(meta, title, body, copy);
          els.followupEntryList.appendChild(entry);
        });
        els.followupAnswer.hidden = els.followupEntryList.childElementCount === 0;
      }

      function clarificationLinkText(context) {
        return buildClarificationLinkText(context, { language: lang });
      }

      function renderClarificationLink(context) {
        const text = clarificationLinkText(context);
        if (!text || !els.resultSummary.textContent) return;
        els.resultSummary.textContent = `${els.resultSummary.textContent}\n${text}`;
      }

      function clarificationHistoryText(context) {
        return buildClarificationHistoryText(context);
      }

      function showStoredRecord(record) {
        if (!record) return false;

        lastRecord = record;
        currentShareLink = null;
        currentResonanceSubmission = null;
        updateShareLinkUi();
        updateResonanceUi();
        showResult();
        els.answerPanel.classList.toggle("is-daily-note", record.mode === "daily");
        els.tarotSymbol.hidden = !record.imageSrc;
        els.guaSymbol.hidden = true;
        els.anchorGrid.hidden = !record.anchor;
        els.dailyNoteStatus.hidden = record.mode !== "daily";
        if (record.reading) showTarotReading(record.reading);
        else hideTarotReading();
        const report = reportFromRecord(record);
        if (report) renderStructuredReport(report);
        else hideReport();
        renderClarificationLink(record.clarificationOf);
        renderStoredFollowups(record);
        updateReviewUi(record);
        setResultLabels(record.mode);
        els.answerKicker.textContent = resultHeadingText(record);
        els.action.textContent = actionFromRecord(record);
        lastAction = els.action.textContent;
        lastQuestion = cleanText(record.question, "");

        if (record.imageSrc) {
          els.cardImage.src = record.imageSrc;
          els.cardImage.alt = cleanText(record.imageAlt || record.title, "");
        }

        if (record.gua?.binary) {
          els.guaSymbol.hidden = false;
          renderGua(record.gua.binary);
        }

        if (record.anchor) {
          els.anchorColor.textContent = record.anchor.color || "—";
          els.anchorObject.textContent = record.anchor.object || "—";
          els.anchorMoment.textContent = record.anchor.moment || "—";
        }

        updateSymbolSummary({
          sourceMode: record.mode,
          name: record.imageAlt || record.gua?.name || normalizedTitleText(record) || record.title || "",
          question: record.question || "",
          cards: record.cards || []
        });

        if (isSystemV1 && record.mode !== "daily") {
          renderResultWorkflow(els, record, { language: lang });
          setSuccessfulResultActions(els, record.lifecycleState !== "temporary" || Boolean(record.answer));
        }

        return true;
      }

      function syncAfterSave(record) {
        syncClient.syncHistory()
          .then((result) => result.status === "synced" && record.mode === "daily" ? syncClient.saveDailyAnchor(todayKey(), record) : result)
          .then((result) => {
            renderHistoryList();
            if (result?.status === "synced") updateAuthUi(t("authSynced"));
          })
          .catch((error) => {
            console.warn("Sync skipped", error);
            updateAuthUi(t("accountSyncFailed"));
          });
      }

      function openUtilityPanel(panel) {
        closeUtilityPanels();
        panel.hidden = false;
        panel.setAttribute("aria-hidden", "false");
      }

      function closeUtilityPanels() {
        [els.historyPanel, els.authPanel, els.resonancePanel, els.companionPanel].forEach((panel) => {
          panel.hidden = true;
          panel.setAttribute("aria-hidden", "true");
        });
      }

      function renderHistoryList() {
        const records = loadHistory(recordStore);
        const visibleRecords = historyFilter === "all"
          ? records
          : records.filter((record) => record.mode === historyFilter);
        els.historyList.innerHTML = "";
        updateHistoryFilters();
        updateWeeklySummaryUi(records);

        if (!visibleRecords.length) {
          const empty = document.createElement("p");
          empty.className = "history-empty";
          empty.textContent = t("historyEmpty");
          els.historyList.appendChild(empty);
          return;
        }

        groupHistoryByDate(visibleRecords).forEach((group) => {
          const section = document.createElement("section");
          section.className = "history-group";

          const heading = document.createElement("h3");
          heading.textContent = group.label;
          section.appendChild(heading);

          group.records.forEach((record) => {
            const row = document.createElement("div");
            row.className = "history-row";

            const item = document.createElement("button");
            item.type = "button";
            item.className = "history-item";
            item.dataset.id = record.id;

            const title = document.createElement("strong");
            title.textContent = recordTitle(record);
            const meta = document.createElement("span");
            meta.textContent = historyMeta(record);
            const action = document.createElement("em");
            action.textContent = historySummary(record);
            item.classList.toggle("is-daily", record.mode === "daily");

            const tags = historyTags(record);
            const tagRow = document.createElement("div");
            tagRow.className = "history-tags";
            tags.forEach((label) => {
              const tag = document.createElement("span");
              tag.textContent = label;
              tagRow.appendChild(tag);
            });
            tagRow.hidden = tags.length === 0;

            const favorite = document.createElement("button");
            favorite.type = "button";
            favorite.className = "history-favorite";
            favorite.dataset.historyFavorite = record.id;
            favorite.classList.toggle("is-selected", Boolean(record.favorite));
            favorite.setAttribute("aria-pressed", record.favorite ? "true" : "false");
            favorite.textContent = record.favorite ? t("historyFavorited") : t("historyFavorite");

            item.append(title, meta, action, tagRow);
            row.append(item, favorite);
            section.appendChild(row);
          });

          els.historyList.appendChild(section);
        });
      }

      function updateHistoryFilters() {
        els.historyFilters.querySelectorAll("[data-history-filter]").forEach((button) => {
          button.classList.toggle("is-selected", button.dataset.historyFilter === historyFilter);
        });
      }

      function groupHistoryByDate(records) {
        const groups = new Map();
        records.forEach((record) => {
          const key = historyDateKey(record.createdAt);
          if (!groups.has(key)) groups.set(key, { label: historyDateLabel(record.createdAt), records: [] });
          groups.get(key).records.push(record);
        });
        return Array.from(groups.values());
      }

      function historyDateKey(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "unknown";
        return date.toLocaleDateString("en-CA");
      }

      function historyDateLabel(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return lang === "zh" ? "时间未知" : "Unknown date";
        return date.toLocaleDateString(lang === "zh" ? "zh-CN" : "en", {
          month: "2-digit",
          day: "2-digit",
          weekday: "short"
        });
      }

      function recordTitle(record) {
        return record.mode === "daily"
          ? `${formatDate(record.createdAt)} ${lang === "zh" ? "复盘" : "Review"}`
          : normalizedTitleText(record) || modeLabelText(record.mode);
      }

      function historyMeta(record) {
        const modeLabel = modeLabelText(record.mode);
        const detail = record.mode === "daily" ? formatDailyAnchor(record) : formatDate(record.createdAt);
        return [modeLabel, detail].filter(Boolean).join(" · ");
      }

      function historySummary(record) {
        const followupCount = Array.isArray(record.followups) ? record.followups.length : 0;
        const relation = record.clarificationOf ? t("historyClarification") : "";
        const followups = followupCount ? `${t("historyFollowupCount")} ${followupCount}` : "";
        return [
          actionFromRecord(record),
          actionStatusLabel(record.actionStatus),
          isReviewDue(record) && !record.reviewNote ? t("reviewLabel") : "",
          followups,
          relation
        ].filter(Boolean).join(" · ");
      }

      function historyTags(record) {
        const followupCount = Array.isArray(record.followups) ? record.followups.length : 0;
        return [
          record.favorite ? t("historyTagFavorite") : "",
          record.reviewNote ? t("historyTagReviewed") : isReviewDue(record) ? t("historyTagReview") : "",
          record.actionStatus === "done" ? t("historyTagDone") : "",
          followupCount ? `${t("historyTagFollowup")} ${followupCount}` : "",
          record.clarificationOf ? t("historyTagClarification") : ""
        ].filter(Boolean);
      }

      function toggleHistoryFavorite(id) {
        const record = loadHistory(recordStore).find((entry) => entry.id === id);
        if (!record) return;
        const updated = {
          ...record,
          favorite: !record.favorite,
          updatedAt: new Date().toISOString()
        };
        saveHistoryRecord(recordStore, updated);
        if (lastRecord?.id === updated.id) lastRecord = updated;
        syncAfterSave(updated);
        renderHistoryList();
      }

      function weeklySummaryRecords(records = loadHistory(recordStore)) {
        return records
          .map((record) => {
            const report = reportFromRecord(record) || {};
            const summary = cleanTaggedOutputText(record.report?.summary || report.summary || record.reading?.judgment || record.action || record.title, "");
            const action = cleanTaggedOutputText(record.action || record.report?.actionText || report.actionText || "", "");
            if (!summary && !action) return null;
            return {
              mode: record.mode || "tarot",
              title: cleanText(record.title || record.imageAlt || record.gua?.name, "").slice(0, 80),
              question: cleanText(record.question, "").slice(0, 80),
              summary: summary.slice(0, 220),
              action: action.slice(0, 160),
              actionStatus: record.actionStatus || "",
              reviewNote: cleanText(record.reviewNote, "").slice(0, 140),
              createdAt: record.createdAt
            };
          })
          .filter(Boolean)
          .slice(0, 7);
      }

      function updateWeeklySummaryUi(records = loadHistory(recordStore)) {
        const usable = weeklySummaryRecords(records);
        const ready = usable.length >= 3;
        els.weeklySummaryBtn.disabled = isWeeklySummaryRunning || !ready;
        if (isWeeklySummaryRunning) {
          els.weeklySummaryStatus.textContent = t("weeklySummaryWorking");
        } else {
          els.weeklySummaryStatus.textContent = ready ? t("weeklySummaryReady") : `${t("weeklySummaryHint")}${3 - usable.length}`;
        }
        if (els.weeklySummaryActions) {
          els.weeklySummaryActions.hidden = !lastWeeklySummaryText;
        }
      }

      async function generateWeeklySummary() {
        if (isWeeklySummaryRunning) return;
        const records = weeklySummaryRecords();
        if (records.length < 3) {
          updateWeeklySummaryUi();
          return;
        }
        isWeeklySummaryRunning = true;
        els.weeklySummaryResult.hidden = false;
        els.weeklySummaryResult.textContent = "";
        lastWeeklySummaryText = "";
        els.weeklySummaryActions.hidden = true;
        updateWeeklySummaryUi();
        try {
          const full = await streamReading({
            mode: "weekly-summary",
            tier: "basic",
            entry: "weekly",
            records,
            language: lang
          }, (text) => {
            els.weeklySummaryResult.textContent = cleanTaggedOutputText(text, "", {
              preferredOrder: ["THEME", "STUCK_POINT", "NEXT_ACTION"]
            });
          });
          els.weeklySummaryResult.textContent = cleanTaggedOutputText(full, t("weeklySummaryFailed"), {
            preferredOrder: ["THEME", "STUCK_POINT", "NEXT_ACTION"]
          });
          lastWeeklySummaryText = els.weeklySummaryResult.textContent;
        } catch (error) {
          console.error(error);
          els.weeklySummaryResult.textContent = t("weeklySummaryFailed");
          lastWeeklySummaryText = "";
        } finally {
          isWeeklySummaryRunning = false;
          updateWeeklySummaryUi();
        }
      }

      async function copyWeeklySummary() {
        if (!lastWeeklySummaryText) return;
        const result = await copyTextToClipboard(lastWeeklySummaryText);
        setCopyFallback(lastWeeklySummaryText, result);
        els.weeklySummaryStatus.textContent = result === "manual" ? t("copyManual") : t("weeklySummaryCopied");
      }

      function saveWeeklySummaryRecord() {
        const text = cleanText(lastWeeklySummaryText, "");
        if (!text) return;
        const createdAt = new Date().toISOString();
        const record = createRecord({
          mode: "daily",
          title: lang === "zh" ? "本周重复线索" : "Repeated weekly signals",
          question: "",
          answer: text,
          action: text.split("\n").filter(Boolean).at(-1) || text,
          reviewAt: reviewDateAfter(createdAt, 7),
          report: {
            summary: text,
            actionText: text.split("\n").filter(Boolean).at(-1) || text,
            sourceMode: "daily"
          }
        });
        saveHistoryRecord(recordStore, record);
        syncAfterSave(record);
        renderHistoryList();
        els.weeklySummaryStatus.textContent = t("weeklySummarySaved");
      }

      function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString(lang === "zh" ? "zh-CN" : "en", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      function formatDailyAnchor(record) {
        const anchor = record.anchor || {};
        const parts = [anchor.color, anchor.object, anchor.moment].filter(Boolean);
        return parts.length ? parts.join(" · ") : formatDate(record.createdAt);
      }

      function actionStatusLabel(status) {
        const labels = {
          done: t("actionStatusDone"),
          not_done: t("actionStatusNotDone"),
          skipped: t("actionStatusSkipped"),
          not_fit: t("actionStatusNotFit")
        };
        return labels[status] || "";
      }

      function updateAuthUi(message = "") {
        const session = syncClient.getSession();
        const recordCount = loadHistory(recordStore).length;
        els.accountBtn.textContent = session?.access_token ? t("accountReady") : t("account");
        els.authStatus.textContent = message || (session?.user?.email ? `${t("authSignedIn")}${session.user.email}` : t("authSignedOut"));
        if (els.accountSyncStatus) {
          const syncLabel = session?.access_token ? t("accountSyncReady") : t("accountSyncIdle");
          els.accountSyncStatus.textContent = `${syncLabel} · ${t("accountRecordsCount")}${recordCount}`;
        }
        if (els.accountSaveScope) {
          els.accountSaveScope.textContent = session?.access_token ? t("accountCloudScope") : t("accountLocalScope");
        }
        els.signout.hidden = !session?.access_token;
        els.passwordUpdate.hidden = !session?.access_token;
        refreshPlanUi();
      }

      function setPlanUi(plan = "free") {
        if (!els.planStatus) return;
        const title = els.planStatus.querySelector("strong");
        const copy = els.planStatus.querySelector("span:not(.plan-note)");
        if (title) title.textContent = plan === "pro" ? t("planProTitle") : t("planFreeTitle");
        if (copy) copy.textContent = plan === "pro" ? t("planProCopy") : t("planFreeCopy");
      }

      async function refreshPlanUi() {
        const session = syncClient.getSession();
        if (!session?.access_token) {
          setPlanUi("free");
          return;
        }
        try {
          const entitlement = await syncClient.loadEntitlement();
          setPlanUi(entitlement.plan === "pro" ? "pro" : "free");
        } catch {
          setPlanUi("free");
        }
      }

      async function syncAndRefresh() {
        const result = await syncClient.syncHistory();
        const daily = await syncClient.loadDailyAnchor(todayKey());
        if (daily.record) {
          saveDailyAnchor(recordStore, todayKey(), daily.record);
          saveHistoryRecord(recordStore, daily.record);
        }
        renderHistoryList();
        updateAuthUi(result.status === "synced" ? t("authSynced") : "");
        return result;
      }

      async function syncAndRefreshQuietly() {
        try {
          return await syncAndRefresh();
        } catch (error) {
          console.warn("Sync skipped", error);
          renderHistoryList();
          updateAuthUi(t("accountSyncFailed"));
          return { status: "sync-failed" };
        }
      }

      async function clearAllRecords() {
        if (isSystemV1) {
          clearLocalRecords(recordStore);
          renderHistoryList();
          updateAuthUi(t("clearDone"));
          return;
        }
        clearHistory(recordStore);
        clearDailyAnchors(recordStore);
        renderHistoryList();
        if (syncClient.getSession()?.access_token) {
          await syncClient.clearCloudRecords();
        }
        updateAuthUi(t("clearDone"));
      }

      function analyticsDisabled() {
        try { return localStorage.getItem(ANALYTICS_DISABLED_KEY) === "true"; } catch { return false; }
      }

      function renderSettings() {
        if (!els.settingsView) return;
        renderSettingsView(els.settingsView, {
          signedIn: Boolean(syncClient.getSession()?.access_token),
          analyticsDisabled: analyticsDisabled(),
          theme: document.documentElement.dataset.theme || "night",
          language: lang
        });
      }

      function settingsStatus(message) {
        const status = els.settingsView?.querySelector("[data-settings-status]");
        if (status) status.textContent = message;
      }

      function downloadAccountExport() {
        const payload = syncClient.exportData({
          theme: document.documentElement.dataset.theme,
          language: lang,
          analyticsDisabled: analyticsDisabled()
        });
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `askaura-export-${todayKey()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        settingsStatus("数据已导出。文件不包含登录令牌。 ");
      }

      async function handleSettingsInteraction(event) {
        const theme = event.target.closest("[data-settings-theme]")?.dataset.settingsTheme;
        if (theme) {
          applyTheme(theme);
          renderSettings();
          return;
        }
        const language = event.target.closest("[data-settings-language]")?.dataset.settingsLanguage;
        if (language) {
          applyLanguage(language);
          renderSettings();
          return;
        }
        if (event.target.matches("[data-settings-analytics]")) {
          try { localStorage.setItem(ANALYTICS_DISABLED_KEY, String(!event.target.checked)); } catch {}
          settingsStatus(event.target.checked ? "匿名产品统计已开启。" : "匿名产品统计已关闭。");
          return;
        }
        const action = event.target.closest("[data-settings-action]")?.dataset.settingsAction;
        if (!action) return;
        if (action === "export") {
          downloadAccountExport();
        } else if (action === "purge-local") {
          if (!confirm("只清空这台设备上的象问记录？")) return;
          clearLocalRecords(recordStore);
          renderHistoryList();
          renderAdaptiveHome();
          renderSettings();
          settingsStatus("本机记录已清空，云端记录未改变。");
        } else if (action === "purge-cloud") {
          if (!confirm("清空当前账号的云端记录？本机记录不会被删除。")) return;
          const result = await syncClient.clearCloudRecords();
          settingsStatus(result.status === "synced" ? "云端记录已清空，本机记录未改变。" : "请先登录。");
        } else if (action === "delete-account") {
          if (!confirm("删除当前账号及云端数据？这项操作无法撤销。")) return;
          const result = await syncClient.deleteAccount();
          settingsStatus(result.status === "deleted" ? "账号已删除。本机记录仍在当前设备。" : "请先登录。");
          updateAuthUi();
          renderSettings();
        }
      }

      async function submitAuth(action) {
        const email = els.authEmail.value.trim();
        const password = els.authPassword.value;
        if (!email || !password) return;
        if (password.length < 6) {
          updateAuthUi(t("authWeakPassword"));
          return;
        }

        els.authStatus.textContent = t("authWorking");
        try {
          if (action === "signup") {
            const result = await syncClient.signUpWithPassword(email, password);
            if (!result.access_token) {
              updateAuthUi(t("authSignupPending"));
              return;
            }
            await syncAndRefreshQuietly();
            updateAuthUi(t("authSignupDone"));
            return;
          }

          await syncClient.signInWithPassword(email, password);
          await syncAndRefreshQuietly();
        } catch (error) {
          console.error(error);
          updateAuthUi(authErrorText(error));
        }
      }

      async function requestPasswordReset() {
        const email = els.authEmail.value.trim();
        if (!email) return;

        els.authStatus.textContent = t("authWorking");
        try {
          await syncClient.requestPasswordReset(email, location.origin + location.pathname);
          updateAuthUi(t("authResetSent"));
        } catch (error) {
          console.error(error);
          updateAuthUi(authErrorText(error));
        }
      }

      async function updatePasswordFromForm() {
        const password = els.authPassword.value;
        if (password.length < 6) {
          updateAuthUi(t("authWeakPassword"));
          return;
        }

        els.authStatus.textContent = t("authWorking");
        try {
          await syncClient.updatePassword(password);
          await syncAndRefreshQuietly();
          updateAuthUi(t("authPasswordUpdated"));
        } catch (error) {
          console.error(error);
          updateAuthUi(authErrorText(error));
        }
      }

      function authErrorText(error) {
        const message = String(error?.message || "").toLowerCase();
        if (message.includes("already") || message.includes("registered")) return t("authEmailExists");
        if (message.includes("not confirmed") || message.includes("confirm")) return t("authUnconfirmed");
        if (message.includes("invalid login credentials")) return t("authInvalidCredentials");
        if (message.includes("rate limit") || message.includes("too many")) return t("authEmailRateLimited");
        if (message.includes("password") && (message.includes("6") || message.includes("weak"))) return t("authWeakPassword");
        return error?.message ? `${t("authDetailPrefix")}${error.message}` : t("authFailed");
      }

      function cleanAuthUrl() {
        if (!location.hash && !location.search.includes("code=") && !location.search.includes("error")) return;
        history.replaceState(null, "", location.pathname || "/");
      }

      async function handleAuthRedirect() {
        try {
          const result = await syncClient.completeSessionFromUrl(location.href);
          if (result.status === "signed-in") {
            cleanAuthUrl();
            await syncAndRefreshQuietly();
            openUtilityPanel(els.authPanel);
            updateAuthUi(t("authConfirmed"));
            return;
          }
          if (result.status === "needs-login") {
            cleanAuthUrl();
            openUtilityPanel(els.authPanel);
            updateAuthUi(t("authConfirmLogin"));
          }
        } catch (error) {
          console.error(error);
          cleanAuthUrl();
          openUtilityPanel(els.authPanel);
          updateAuthUi(t("authConfirmFailed"));
        }
      }

      async function runExperience(event) {
        event.preventDefault();
        if (isRunning) return;
        const requestDetail = event.detail || {};
        if (mode === "daily") {
          const dailyRecord = loadDailyAnchor(recordStore, todayKey());
          if (dailyRecord && showStoredRecord(dailyRecord)) return;
        }

        const question = mode === "tarot" || mode === "dual"
          ? (requestDetail.question || els.input.value.trim() || t("fallbackQuestion"))
          : mode === "meihua"
            ? (els.input.value.trim() || (lang === "zh" ? "此刻起卦，观察下一步方向。" : "Cast this moment and read the next direction."))
            : "";

        const preparation = prepareObservation(question);
        if (preparation.status !== "ready") {
          showSafetyNotice({ route: preparation.status === "support" ? "support" : "professional-boundary" });
          return;
        }

        if (!requestDetail.skipQuestionAssist && shouldOfferQuestionAssist(question)) {
          await showQuestionAssist(question);
          return;
        }

        isRunning = true;
        setNavigationLocked(true);
        els.cast.classList.add("is-loading");
        els.signalRow.classList.add("is-running");
        setSignalPhase(0);
        els.cast.textContent = t(modeConfig().generating);
        lastQuestion = question;
        const observationStartedAt = performance.now();
        productEvents.emit("observation_started", { mode, lifecycleState: "temporary" });
        let generationFailed = false;
        try {
          const ritualResult = await playRitual(mode);
          showBrandLoading(mode);
          hideRitual();
          showResult();
          els.answerPanel.classList.toggle("is-daily-note", mode === "daily");
          els.loading.hidden = false;
          els.action.hidden = true;
          els.action.textContent = "";
          els.action.classList.remove("is-typing");
          els.anchorGrid.hidden = true;
          els.dailyNoteStatus.hidden = true;
          hideTarotReading();
          hideReport();
          els.cast.disabled = true;
          els.again.disabled = true;
          els.save.disabled = true;
          els.newReading.disabled = true;
          els.copy.disabled = true;
          els.copySummary.disabled = true;
          els.copyFull.disabled = true;
          els.shareImage.disabled = true;
          els.exportPdf.disabled = true;
          els.room.setAttribute("aria-busy", "true");
          lastAction = "";

          if (mode === "tarot") {
            if (!ritualResult?.cards?.length) throw new Error("Card selection missing");
            const selectedCards = ritualResult.cards.map(recordCardFromSelection);
            const primaryCard = primaryCardFromRecordCards(selectedCards);
            const clarificationContext = pendingClarificationContext;
            els.tarotSymbol.hidden = false;
            els.guaSymbol.hidden = true;
            showReflectionCardImage(primaryCard);
            els.answerKicker.textContent = `${t("modeTarot")} · ${spreadDisplayName(ritualResult.spreadType)} · ${primaryCard.imageAlt}`;
            updateSymbolSummary({ sourceMode: "tarot", name: els.cardImage.alt, question, cards: selectedCards });
            const request = buildReflectionReadingRequest({
              cards: selectedCards,
              question,
              language: lang,
              entry: "tarot",
              sessionHistory: clarificationHistoryText(clarificationContext),
            });
            const full = await streamReading(request, renderAction);
            const readingParts = completeReflectionReading(full, selectedCards, lang);
            renderReflectionReading(readingParts);
            const report = {
              summary: readingParts.reflection,
              tarotText: readingParts.hidden,
              guaText: "",
              dualText: readingParts.verify,
              actionText: readingParts.action,
              questionText: question,
              sourceMode: "tarot",
              deckVersion: primaryCard.deckVersion
            };
            renderStructuredReport(report);
            renderClarificationLink(clarificationContext);
            saveResultRecord({
              mode: "tarot",
              title: els.answerKicker.textContent,
              question,
              answer: full,
              action: lastAction,
              reading: readingParts,
              report,
              imageSrc: els.cardImage.getAttribute("src"),
              imageAlt: els.cardImage.alt,
              spreadType: ritualResult.spreadType,
              deckVersion: primaryCard.deckVersion,
              meaningVersion: primaryCard.meaningVersion,
              cards: selectedCards,
              ...(clarificationContext ? { clarificationOf: clarificationContext } : {})
            });
          } else if (mode === "meihua") {
            const guaSeed = selectedGuaCastMethod === "time" ? "" : cleanText(els.guaSeedInput.value, "1");
            const gua = guaFromCast(selectedGuaCastMethod, guaSeed);
            els.tarotSymbol.hidden = true;
            els.guaSymbol.hidden = false;
            renderGua(gua.binary);
            els.answerKicker.textContent = `${t("modeMeihua")} · ${lang === "zh" ? gua.name : gua.en}`;
            updateSymbolSummary({ sourceMode: "meihua", name: lang === "zh" ? gua.name : gua.en, question, cards: [] });
            const full = await streamReading({
              mode: "meihua-reading",
              tier: "basic",
              entry: "meihua",
              guaName: gua.name,
              intent: lang === "zh" ? "看清" : "clarity",
              question,
              language: lang
            }, renderAction);
            const meihua = renderMeihuaReading(full);
            const report = {
              summary: meihua.trend || meihua.signal || meihua.action,
              tarotText: meihua.signal,
              guaText: meihua.trend,
              actionText: meihua.action,
              dontText: meihua.avoid,
              watchText: meihua.watch,
              questionText: question,
              sourceMode: "meihua"
            };
            renderStructuredReport(report);
            saveResultRecord({
              mode: "meihua",
              title: els.answerKicker.textContent,
              question,
              answer: full,
              action: lastAction,
              report,
              gua
            });
          } else if (mode === "dual") {
            if (!ritualResult?.cards?.length) throw new Error("Card selection missing");
            const selectedCards = ritualResult.cards.map(recordCardFromSelection);
            const primaryCard = primaryCardFromRecordCards(selectedCards);
            const gua = guaFromTime();
            els.tarotSymbol.hidden = false;
            els.guaSymbol.hidden = false;
            showReflectionCardImage(primaryCard);
            renderGua(gua.binary);
            els.answerKicker.textContent = `${t("modeDual")} · ${primaryCard.imageAlt} / ${lang === "zh" ? gua.name : gua.en}`;
            updateSymbolSummary({ sourceMode: "dual", name: els.cardImage.alt, question, cards: selectedCards });
            const full = await streamReading(buildDualReadingRequest({
              question,
              cards: selectedCards.map(({ name, label, position, orientation }) => ({ name, label, position, orientation })),
              guaName: gua.name,
              language: lang,
              intent: lang === "zh" ? "看清" : "clarity"
            }), renderAction);
            const tokens = parseTokens(full);
            const tarotParts = {
              coreQuestion: cleanTaggedOutputText(tokens.TAROT_EVIDENCE, ""),
              tension: cleanTaggedOutputText(tokens.TAROT_EVIDENCE, ""),
              judgment: cleanTaggedOutputText(tokens.SUMMARY, ""),
              avoid: cleanTaggedOutputText(tokens.AVOID, ""),
              watch: cleanTaggedOutputText(tokens.WATCH, "")
            };
            const guaEvidence = cleanTaggedOutputText(tokens.GUA_EVIDENCE, "");
            renderAction(full);
            showDualReading(tarotParts, gua, lastAction);
            const report = {
              summary: tarotParts.judgment || (lang === "zh" ? "牌象和卦象都在提醒你先降低噪音，再决定下一步。" : "Card and gua signals both suggest reducing noise before choosing the next step."),
              tarotText: tarotParts.tension || tarotParts.coreQuestion,
              guaText: guaEvidence,
              dualText: tarotParts.judgment,
              actionText: lastAction,
              dontText: tarotParts.avoid,
              watchText: tarotParts.watch,
              questionText: question,
              sourceMode: "dual"
            };
            renderStructuredReport(report);
            saveResultRecord({
              mode: "dual",
              title: els.answerKicker.textContent,
              question,
              answer: full,
              action: lastAction,
              reading: tarotParts,
              report,
              gua,
              imageSrc: els.cardImage.getAttribute("src"),
              imageAlt: els.cardImage.alt,
              spreadType: "single",
              cards: selectedCards
            });
          } else {
            els.tarotSymbol.hidden = true;
            els.guaSymbol.hidden = true;
            els.answerKicker.textContent = t("dailyNoteTitle");
            const full = await streamReading({
              mode: "anchor",
              tier: "basic",
              entry: "daily",
              cardName: t("dailyNoteTitle"),
              orientation: "upright",
              language: lang
            }, renderAnchor);
            const anchor = renderAnchor(full);
            saveResultRecord({
              mode: "daily",
              title: t("dailyRecordTitle"),
              question: "",
              answer: lastAction || "",
              action: lastAction,
              anchor
            });
            els.dailyNoteStatus.hidden = false;
          }
        } catch (error) {
          if (error?.name === "RitualCancelled") {
            els.room.dataset.step = "compose";
            return;
          }
          generationFailed = true;
          renderStructuredReport({
            summary: lang === "zh" ? "这次没有等到清晰回应，可以先停一下，稍后换个更具体的问题再试。" : "No clear response arrived this time. Pause, then try again with a more specific question.",
            actionText: lang === "zh" ? "先停一下，稍后换个更具体的问题再试一次。" : "Pause, then try again with a more specific question.",
            sourceMode: mode
          });
          if (isSystemV1) {
            renderResultWorkflow(els, {
              answer: "",
              action: "",
              report: { summary: els.resultSummary.textContent }
            }, { failed: true, language: lang });
            setSuccessfulResultActions(els, false);
          }
          console.error(error);
        } finally {
          await waitForBrandLoading();
          hideBrandLoading();
          els.loading.hidden = true;
          els.cast.disabled = false;
          els.cast.classList.remove("is-loading");
          els.signalRow.classList.remove("is-running");
          setSignalPhase(0);
          els.again.disabled = false;
          els.save.disabled = false;
          els.newReading.disabled = false;
          els.copy.disabled = generationFailed;
          els.copySummary.disabled = generationFailed;
          els.copyFull.disabled = generationFailed;
          els.shareImage.disabled = generationFailed;
          els.exportPdf.disabled = generationFailed;
          if (isSystemV1) setSuccessfulResultActions(els, !generationFailed && Boolean(lastRecord));
          productEvents.emit(generationFailed ? "flow_failed" : "observation_completed", {
            mode,
            lifecycleState: lastRecord?.lifecycleState || "",
            durationMs: performance.now() - observationStartedAt,
            errorCode: generationFailed ? "generation_failed" : ""
          });
          els.room.removeAttribute("aria-busy");
          isRunning = false;
          pendingClarificationContext = null;
          setNavigationLocked(false);
          updateCastCopy();
          setResultLabels(mode);
        }
      }

      function renderAction(rawText) {
        const tokens = parseTokens(rawText);
        const sentence = cleanTaggedOutputText(tokens.ACTION, "");
        if (!sentence) return "";
        lastAction = sentence;
        return sentence;
      }

      function renderMeihuaReading(rawText) {
        const report = meihuaReportFromText(rawText);
        renderAction(rawText);
        return report;
      }

      function renderTarotReading(rawText) {
        const tokens = parseTokens(rawText);
        const parts = {
          coreQuestion: cleanText(tokens.CORE_QUESTION, ""),
          tension: cleanText(tokens.TENSION, ""),
          judgment: cleanText(tokens.JUDGMENT, ""),
          avoid: cleanTaggedOutputText(tokens.AVOID, ""),
          watch: cleanTaggedOutputText(tokens.WATCH, "")
        };
        showTarotReading({
          cardMessage: parts.tension,
          stuckText: parts.coreQuestion,
          judgment: parts.judgment
        });
        renderAction(rawText);
        return parts;
      }

      function renderReflectionReading(parts) {
        showTarotReading({
          cardMessage: parts.reflection,
          stuckText: parts.hidden,
          judgment: parts.verify
        });
        lastAction = parts.action;
        els.action.textContent = parts.action;
        return parts;
      }

      function showDualReading(tarotParts, gua, meihuaAction) {
        hideTarotReading();
        lastAction = meihuaAction || lastAction;
        if (lastAction) els.action.textContent = lastAction;
      }

      function renderAnchor(rawText) {
        const tokens = parseTokens(rawText);
        const sentence = (tokens.ANCHOR_TAKEAWAY || tokens.ACTION || "").replace(/\s+/g, " ").trim();
        if (sentence) {
          lastAction = sentence;
          els.action.textContent = sentence;
        }
        els.anchorGrid.hidden = false;
        els.anchorColor.textContent = tokens.ANCHOR_COLOR || "—";
        els.anchorObject.textContent = tokens.ANCHOR_OBJECT || "—";
        els.anchorMoment.textContent = tokens.ANCHOR_MOMENT || "—";
        return {
          color: tokens.ANCHOR_COLOR || "",
          object: tokens.ANCHOR_OBJECT || "",
          moment: tokens.ANCHOR_MOMENT || ""
        };
      }

      async function copyTextToClipboard(text) {
        if (!text) return "failed";

        if (copyTextViaSelection(text) && await clipboardMatches(text)) {
          clearSelection();
          return "copied";
        }

        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            if (await clipboardMatches(text)) {
              clearSelection();
              return "copied";
            }
          } catch {
            // Keep the selected text as the manual fallback.
          }
        }

        selectActionSentence();
        return "manual";
      }

      function copyTextViaSelection(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, text.length);

        try {
          return document.execCommand("copy");
        } catch {
          return false;
        } finally {
          textarea.remove();
        }
      }

      async function clipboardMatches(text) {
        if (!navigator.clipboard?.readText) return true;

        try {
          return (await navigator.clipboard.readText()) === text;
        } catch {
          return true;
        }
      }

      function selectActionSentence() {
        const selection = window.getSelection();
        if (!selection || !els.action.textContent) return;

        const range = document.createRange();
        range.selectNodeContents(els.action);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function clearSelection() {
        window.getSelection()?.removeAllRanges();
      }

      function shareSymbolLabel(record = lastRecord) {
        if (record?.mode === "meihua" && record.gua) return guaDescription(record.gua);
        const card = primaryCardFromRecordCards(record?.cards);
        return cleanText(card?.name || card?.imageAlt || normalizedTitleText(record) || record?.title || els.symbolNameLabel.textContent, "");
      }

      function shareResultData({ includeQuestion = false } = {}) {
        const context = currentResultContext || {};
        const record = lastRecord || {};
        const report = reportFromRecord(record) || {};
        const summary = cleanTaggedOutputText(context.summary || report.summary || record.report?.summary || record.reading?.judgment || els.resultSummary.textContent, "");
        const action = cleanTaggedOutputText(context.actionText || report.actionText || record.action || lastAction || els.action.textContent, "");
        const doText = cleanText(context.doText || els.actionDo.textContent || action, "");
        const dontText = cleanText(context.dontText || els.actionDont.textContent, "");
        const watchText = cleanText(context.watchText || els.actionWatch.textContent, "");
        const reviewNote = cleanText(record.reviewNote, "");
        const question = includeQuestion ? cleanText(record.question || lastQuestion, "") : "";
        const primaryCard = primaryCardFromRecordCards(record?.cards);
        return {
          brand: "AskAura",
          title: cleanText(resultHeadingText(record) || els.answerKicker.textContent || t("answerTitle"), ""),
          symbol: shareSymbolLabel(record),
          summary,
          action: action || doText,
          doText,
          dontText,
          watchText,
          reviewNote,
          question,
          imageSrc: cleanText(primaryCard?.imageSrc || record.imageSrc || els.cardImage?.getAttribute("src"), ""),
          imageAlt: cleanText(primaryCard?.imageAlt || record.imageAlt || els.cardImage?.alt, ""),
          observationId: record.id || "",
          createdAt: record.createdAt || ""
        };
      }

      function compactShareLines(data) {
        return formatCompactShareLines(data, {
          action: lang === "zh" ? "行动" : "Action"
        });
      }

      function fullShareLines(data) {
        return [
          data.title,
          data.question ? `${lang === "zh" ? "问题" : "Question"}: ${data.question}` : "",
          data.symbol ? `${lang === "zh" ? "象" : "Symbol"}: ${data.symbol}` : "",
          data.summary ? `${lang === "zh" ? "当前主线" : "Thread"}: ${data.summary}` : "",
          data.doText ? `${lang === "zh" ? "今天可以做" : "Do"}: ${data.doText}` : "",
          data.dontText ? `${lang === "zh" ? "今天不要做" : "Do not"}: ${data.dontText}` : "",
          data.watchText ? `${lang === "zh" ? "接下来观察" : "Watch"}: ${data.watchText}` : "",
          data.reviewNote ? `${lang === "zh" ? "复盘" : "Review"}: ${data.reviewNote}` : ""
        ].filter(Boolean);
      }

      function copySuccessText(kind) {
        const keys = {
          action: "copiedAction",
          summary: "copiedSummary",
          full: "copiedFull",
        };
        return t(keys[kind] || keys.action);
      }

      function setCopyFallback(text, result) {
        els.copyFallbackText.value = text;
        els.copyFallbackText.hidden = result !== "manual";
        if (result === "manual") {
          els.copyFallbackText.focus();
          els.copyFallbackText.select();
        }
      }

      function updateShareLinkUi(message = "") {
        if (!els.createShareLink || !els.revokeShareLink || !els.shareLinkStatus) return;
        els.revokeShareLink.hidden = !currentShareLink?.id;
        els.createShareLink.textContent = t("createShareLink");
        els.revokeShareLink.textContent = t("revokeShareLink");
        els.shareLinkStatus.textContent = message;
      }

      async function createPrivateShareLink() {
        if (!lastRecord?.id) return;
        els.createShareLink.disabled = true;
        try {
          const result = await syncClient.createShareLink(lastRecord.id, {
            includeQuestion: els.shareIncludeQuestion.checked,
            origin: location.origin,
          });
          if (result.status === "signed-out") {
            updateShareLinkUi(t("shareLinkSignin"));
            openUtilityPanel(els.authPanel);
            return;
          }
          currentShareLink = { id: result.id, url: result.url };
          const copyResult = await copyTextToClipboard(result.url);
          setCopyFallback(result.url, copyResult);
          updateShareLinkUi(copyResult === "manual" ? t("copyManual") : t("shareLinkCreated"));
        } catch (error) {
          console.error(error);
          updateShareLinkUi(t("shareLinkFailed"));
        } finally {
          els.createShareLink.disabled = false;
        }
      }

      async function revokePrivateShareLink() {
        if (!currentShareLink?.id) return;
        els.revokeShareLink.disabled = true;
        try {
          const result = await syncClient.revokeShareLink(currentShareLink.id);
          if (result.status === "signed-out") {
            updateShareLinkUi(t("shareLinkSignin"));
            openUtilityPanel(els.authPanel);
            return;
          }
          currentShareLink = null;
          updateShareLinkUi(t("shareLinkRevoked"));
        } catch (error) {
          console.error(error);
          updateShareLinkUi(t("shareLinkFailed"));
        } finally {
          els.revokeShareLink.disabled = false;
        }
      }

      function updateResonanceUi(message = "") {
        if (!els.resonanceRevoke || !els.shareLinkStatus) return;
        els.resonanceRevoke.hidden = !currentResonanceSubmission?.id;
        const eligible = Boolean(
          lastRecord
          && lastRecord.lifecycleState !== "temporary"
          && lastRecord.actionTheme
          && lastRecord.action
          && lastRecord.echoStatus
        );
        els.resonanceSubmit.disabled = !eligible;
        els.resonanceSubmit.title = eligible ? "" : "完成一次回声后，才能匿名放入共鸣池。";
        if (message) els.shareLinkStatus.textContent = message;
      }

      async function submitCurrentToResonance() {
        if (!lastRecord?.id) return;
        els.resonanceSubmit.disabled = true;
        try {
          const result = await syncClient.submitResonance(lastRecord.id);
          if (result.status === "signed-out") {
            updateResonanceUi(t("resonanceSignin"));
            return;
          }
          currentResonanceSubmission = result.submission || result;
          updateResonanceUi(t("resonanceSubmitted"));
        } catch (error) {
          console.error(error);
          updateResonanceUi(t("resonanceFailed"));
        } finally {
          updateResonanceUi();
        }
      }

      async function revokeCurrentResonance() {
        if (!currentResonanceSubmission?.id) return;
        els.resonanceRevoke.disabled = true;
        try {
          const result = await syncClient.revokeResonance(currentResonanceSubmission.id);
          if (result.status === "signed-out") {
            updateResonanceUi(t("resonanceSignin"));
            return;
          }
          currentResonanceSubmission = null;
          updateResonanceUi(t("resonanceRevoked"));
        } catch (error) {
          console.error(error);
          updateResonanceUi(t("resonanceFailed"));
        } finally {
          els.resonanceRevoke.disabled = false;
        }
      }

      function renderResonancePool(items = []) {
        els.resonanceList.innerHTML = "";
        if (!items.length) {
          const empty = document.createElement("p");
          empty.className = "history-empty";
          empty.textContent = t("resonanceEmpty");
          els.resonanceList.appendChild(empty);
          return;
        }
        items.forEach((item) => {
          const row = document.createElement("article");
          row.className = "resonance-item";
          row.innerHTML = `
            <span>${cleanText(item.symbol || item.category, "")}</span>
            <strong>${cleanText(item.theme, "")}</strong>
            <p>${cleanText(item.action, "")}</p>
            <div>
              <button type="button" data-resonance-reaction="same" data-resonance-id="${cleanText(item.id, "")}">${t("resonanceSame")} · ${Number(item.reactions?.same || 0)}</button>
              <button type="button" data-resonance-reaction="useful" data-resonance-id="${cleanText(item.id, "")}">${t("resonanceUseful")} · ${Number(item.reactions?.useful || 0)}</button>
            </div>
          `;
          els.resonanceList.appendChild(row);
        });
      }

      async function openResonancePool() {
        openUtilityPanel(els.resonancePanel);
        try {
          const result = await syncClient.loadResonancePool({ language: lang });
          renderResonancePool(Array.isArray(result.items) ? result.items : []);
        } catch (error) {
          console.error(error);
          renderResonancePool([]);
        }
      }

      async function reactToResonance(event) {
        const button = event.target.closest("[data-resonance-reaction]");
        if (!button) return;
        button.disabled = true;
        try {
          await syncClient.reactToResonance(button.dataset.resonanceId, button.dataset.resonanceReaction);
          await openResonancePool();
        } catch (error) {
          console.error(error);
          button.disabled = false;
        }
      }

      function renderCompanionList(container, items, renderItem, emptyKey = "companionEmpty") {
        container.innerHTML = "";
        const lines = Array.isArray(items)
          ? items.map((item) => cleanText(renderItem(item), "")).filter(Boolean)
          : [];
        if (!lines.length) {
          const empty = document.createElement("p");
          empty.className = "history-empty";
          empty.textContent = t(emptyKey);
          container.appendChild(empty);
          return;
        }
        lines.forEach((line) => {
          const row = document.createElement("p");
          row.textContent = line;
          container.appendChild(row);
        });
      }

      function companionCountText(label, count) {
        const safeLabel = cleanText(label, "");
        if (!safeLabel) return "";
        return lang === "zh" ? `${safeLabel}：${count}` : `${safeLabel}: ${count}`;
      }

      function companionJoinText(parts = []) {
        const safeParts = parts.map((part) => cleanText(part, "")).filter(Boolean);
        return safeParts.join(lang === "zh" ? "｜" : " · ");
      }

      function companionTrailText(item = {}) {
        return companionJoinText([
          modeLabelText(item.mode),
          item.symbol,
          item.action,
          actionStatusLabel(item.actionStatus),
        ]);
      }

      function companionQuietFlagText(item = {}) {
        const labels = {
          favorites: lang === "zh" ? "收藏过的结果" : "Favorited results",
          review_notes: lang === "zh" ? "写过复盘" : "Review notes",
          followups: lang === "zh" ? "追问过的结果" : "Follow-ups",
          done_actions: lang === "zh" ? "完成过的行动" : "Completed actions",
          clarifications: lang === "zh" ? "澄清牌记录" : "Clarifications"
        };
        return companionCountText(labels[item.key] || item.label, item.count);
      }

      function companionInsightText(snapshot = {}) {
        if (!snapshot.totalRecords || snapshot.totalRecords < 3) return t("companionInsightEmpty");
        const topMode = Object.entries(snapshot.modeCounts || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topSymbol = snapshot.topSymbols?.[0]?.name;
        const topAction = snapshot.actionWords?.[0]?.word;
        const themeParts = [topMode ? modeLabelText(topMode) : "", topSymbol].filter(Boolean).join(lang === "zh" ? " / " : " / ");
        const themeLine = themeParts ? `${t("companionInsightTheme")}${themeParts}` : "";
        const actionLine = topAction ? `${t("companionInsightAction")}${topAction}` : "";
        return [themeLine, actionLine].filter(Boolean).join(lang === "zh" ? "；" : "; ") || t("companionInsightEmpty");
      }

      function openCompanionPanel() {
        if (isSystemV1) {
          renderJourneyView(els.journeyView, loadHistory(recordStore), { language: lang, echoRecordId: "" });
          productEvents.emit("journey_reopened", { lifecycleState: "active" });
          openUtilityPanel(els.companionPanel);
          return;
        }
        const snapshot = deriveCompanionSnapshot(loadHistory(recordStore));
        els.companionInsight.textContent = companionInsightText(snapshot);
        renderCompanionList(els.companionTrail, snapshot.observationTrail || [], companionTrailText, "companionTrailEmpty");
        renderCompanionList(els.companionQuietFlags, snapshot.quietFlags || [], companionQuietFlagText, "companionQuietFlagsEmpty");
        renderCompanionList(
          els.companionThemeMap,
          Object.entries(snapshot.modeCounts || {}),
          ([modeName, count]) => companionCountText(modeLabelText(modeName), count),
          "companionThemeMapEmpty"
        );
        renderCompanionList(els.companionCollection, [
          ...(snapshot.topSymbols || []).map((item) => ({ label: item.name, count: item.count })),
          ...(snapshot.actionWords || []).map((item) => ({ label: item.word, count: item.count })),
        ], (item) => companionCountText(item.label, item.count), "companionCollectionEmpty");
        renderCompanionList(els.companionEcho, snapshot.oneMonthEcho ? [snapshot.oneMonthEcho] : [], companionTrailText, "companionEchoEmpty");
        syncClient.saveCompanionProfile(snapshot, snapshot.quietFlags || [])
          .catch((error) => console.warn("Companion sync skipped", error));
        openUtilityPanel(els.companionPanel);
      }

      function renderJourney(echoRecordId = "") {
        renderJourneyView(els.journeyView, loadHistory(recordStore), { language: lang, echoRecordId });
      }

      function handleJourneyInteraction(event) {
        const echoStatus = event.target.closest("[data-echo-status]")?.dataset.echoStatus;
        if (echoStatus) {
          const recordId = event.target.closest(".journey-echo-prompt")?.dataset.echoRecordId;
          const record = loadHistory(recordStore).find((entry) => entry.id === recordId);
          if (!record) return;
          const updated = addJourneyEcho(record, echoStatus);
          saveHistoryRecord(recordStore, updated);
          syncAfterSave(updated);
          productEvents.emit("echo_recorded", { mode: updated.mode, lifecycleState: updated.lifecycleState });
          renderJourney();
          renderAdaptiveHome();
          return;
        }
        const button = event.target.closest("[data-journey-action]");
        if (!button) return;
        const record = loadHistory(recordStore).find((entry) => entry.id === button.dataset.recordId);
        if (!record) return;
        if (button.dataset.journeyAction === "echo") {
          renderJourney(record.id);
        } else if (["pause", "resume", "close"].includes(button.dataset.journeyAction)) {
          const updated = updateJourneyState(record, button.dataset.journeyAction);
          saveHistoryRecord(recordStore, updated);
          syncAfterSave(updated);
          renderJourney();
          renderAdaptiveHome();
        } else if (button.dataset.journeyAction === "edit") {
          if (showStoredRecord(record)) closeUtilityPanels();
        }
      }

      async function copyShareText(kind) {
        const includeQuestion = els.shareIncludeQuestion.checked;
        const data = shareResultData({ includeQuestion });
        const lines = kind === "full" ? fullShareLines(data) : compactShareLines(data);
        const text = lines.join("\n");
        const result = await copyTextToClipboard(text);
        setCopyFallback(text, result);
        return result;
      }

      function escapeSvg(value) {
        return cleanText(value, "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      async function downloadShareImage() {
        const data = shareResultData({ includeQuestion: els.shareIncludeQuestion.checked });
        try {
          data.imageDataUrl = await imageSourceToDataUrl(data.imageSrc);
        } catch (error) {
          console.warn("Share artwork could not be embedded", error);
          data.imageDataUrl = "";
        }
        const svg = buildObservationShareSvg(data, { language: lang });
        const filename = `askaura-share-${Date.now()}`;
        try {
          const png = await renderSharePngBlob(svg, 1080, 1440);
          downloadBlob(png, `${filename}.png`);
        } catch (error) {
          console.warn("PNG share image failed, falling back to SVG", error);
          downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
        }
      }

      function exportResultPdf() {
        const data = shareResultData({ includeQuestion: els.shareIncludeQuestion.checked });
        const lines = fullShareLines(data);
        const page = window.open("", "_blank");
        if (!page) return false;
        page.document.write(`<!doctype html><html><head><title>AskAura</title><style>
          body{font-family:Georgia,'Noto Serif SC',serif;color:#23211c;background:#f0ede5;margin:48px;line-height:1.7}
          h1{font-size:28px;margin:0 0 24px;color:#9b3a32} p{font-size:16px;white-space:pre-wrap}
          .box{border:1px solid rgba(35,33,28,.2);padding:28px;max-width:720px}
        </style></head><body><main class="box"><h1>AskAura</h1>${lines.map((line) => `<p>${escapeSvg(line)}</p>`).join("")}</main><script>print();<\/script></body></html>`);
        page.document.close();
        return true;
      }

      async function handleSharedResult() {
        const token = new URLSearchParams(location.search).get("share");
        if (!token) return false;
        try {
          const result = await syncClient.loadShareLink(token);
          const payload = result.payload || {};
          const record = {
            id: `shared-${Date.now()}`,
            mode: cleanText(payload.mode, "tarot"),
            title: cleanText(payload.title, t("sharedResultTitle")),
            question: cleanText(payload.question, ""),
            action: cleanTaggedOutputText(payload.action || payload.doText, ""),
            reviewNote: cleanText(payload.reviewNote, ""),
            createdAt: cleanText(payload.createdAt, new Date().toISOString()),
            updatedAt: cleanText(payload.createdAt, new Date().toISOString()),
          };
          lastRecord = record;
          lastQuestion = record.question;
          lastAction = record.action;
          currentResultContext = {
            sourceMode: record.mode,
            summary: cleanTaggedOutputText(payload.summary, ""),
            actionText: record.action,
            doText: cleanText(payload.doText || record.action, ""),
            dontText: cleanText(payload.dontText, ""),
            watchText: cleanText(payload.watchText, ""),
          };
          showResult();
          els.answerKicker.textContent = t("sharedResultTitle");
          els.tarotSymbol.hidden = true;
          els.guaSymbol.hidden = true;
          els.anchorGrid.hidden = true;
          updateSymbolSummary({ sourceMode: record.mode, name: cleanText(payload.symbol, record.title), question: record.question, cards: record.cards || [] });
          renderStructuredReport({
            sourceMode: record.mode,
            summary: currentResultContext.summary,
            actionText: record.action,
          });
          updateReviewUi(record);
          els.save.disabled = true;
          els.newReading.disabled = true;
          els.createShareLink.hidden = true;
          els.revokeShareLink.hidden = true;
          updateShareLinkUi("");
          return true;
        } catch (error) {
          console.error(error);
          showResult();
          els.answerKicker.textContent = t("sharedResultTitle");
          renderStructuredReport({
            sourceMode: "tarot",
            summary: t("sharedResultMissing"),
            actionText: "",
          });
          els.sharePanel.hidden = true;
          els.save.disabled = true;
          els.newReading.disabled = true;
          return true;
        }
      }

      function followupQuestionText(kind, customText = "") {
        return selectFollowupQuestionText(kind, customText, {
          push: t("followupPush"),
          avoid: t("followupAvoid"),
          blocker: t("followupBlocker"),
          review: t("followupReview"),
          clarifyCard: t("followupClarifyCard"),
          fallback: t("followupCustomPlaceholder")
        });
      }

      function followupResultSummary() {
        return buildFollowupResultSummary(currentResultContext || {});
      }

      async function showFollowupAnswer(kind, customText = "") {
        if (isFollowupRunning || !currentResultContext) return;
        const submit = els.followupCustomForm.querySelector("button[type='submit']");
        const question = followupQuestionText(kind, customText);
        if (submit) {
          submit.disabled = true;
          submit.textContent = t("followupWorking");
        }
        isFollowupRunning = true;
        els.followupAnswerText.textContent = "";
        els.followupAnswer.hidden = false;
        try {
          let answer = "";
          await streamReading({
            mode: "followup",
            tier: "basic",
            entry: "followup",
            originalQuestion: lastQuestion || t("fallbackQuestion"),
            resultSummary: followupResultSummary(),
            followupQuestion: question,
            language: lang
          }, (text) => {
            answer = text;
            els.followupAnswerText.textContent = cleanTaggedOutputText(text, "");
          });
          els.followupAnswerText.textContent = cleanTaggedOutputText(answer, t("followupFailed"));
          saveFollowupToCurrentRecord(question, els.followupAnswerText.textContent);
          renderStoredFollowups(lastRecord);
          selectedFollowupKind = "";
          els.followupCustomInput.value = "";
          els.followupPanel.querySelectorAll("[data-followup-question].is-selected").forEach((item) => item.classList.remove("is-selected"));
        } catch (error) {
          console.error(error);
          els.followupAnswerText.textContent = t("followupFailed");
        } finally {
          isFollowupRunning = false;
          updateFollowupSubmit();
          els.followupAnswer.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }

      function updateFollowupSubmit() {
        if (!els.followupCustomForm) return;
        const submit = els.followupCustomForm.querySelector("button[type='submit']");
        if (!submit) return;
        const hasCustomText = Boolean(els.followupCustomInput.value.trim());
        submit.disabled = isFollowupRunning || !hasCustomText;
        submit.textContent = t("followupCustomSubmit");
      }

      function drawClarificationCard() {
        if (isRunning || isFollowupRunning) return;
        showFollowupAnswer("clarify-card");
      }

      function initFieldCanvas() {
        const canvas = document.getElementById("field-canvas");
        const ctx = canvas.getContext("2d");
        let width = 0;
        let height = 0;

        function resize() {
          const ratio = Math.min(devicePixelRatio || 1, 2);
          width = innerWidth;
          height = innerHeight;
          canvas.width = width * ratio;
          canvas.height = height * ratio;
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          draw();
        }

        function draw() {
          ctx.clearRect(0, 0, width, height);
          const cx = width * 0.64;
          const cy = height * 0.48;

          for (let i = 0; i < 7; i++) {
            ctx.strokeStyle = `rgba(226, 214, 190, ${0.018 + i * 0.006})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let angle = -0.28; angle <= Math.PI * 1.35; angle += 0.08) {
              const radius = 116 + i * 48;
              const x = cx + Math.cos(angle + i * 0.08) * radius * 1.14;
              const y = cy + Math.sin(angle) * radius * 0.72;
              if (angle === -0.28) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          const points = [
            [0.34, 0.23, 1.3, 0.035],
            [0.52, 0.18, 1.0, 0.028],
            [0.72, 0.31, 1.6, 0.038],
            [0.81, 0.70, 1.1, 0.026],
            [0.43, 0.76, 1.4, 0.03]
          ];
          points.forEach(([xRatio, yRatio, radius, alpha]) => {
            ctx.fillStyle = `rgba(250, 244, 230, ${alpha})`;
            ctx.beginPath();
            ctx.arc(width * xRatio, height * yRatio, radius, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        addEventListener("resize", resize);
        resize();
      }

      function initPointerEffects() {
        addEventListener("pointermove", (event) => {
          const x = event.clientX / innerWidth;
          const y = event.clientY / innerHeight;
          els.room.style.setProperty("--mx", `${x * 100}%`);
          els.room.style.setProperty("--my", `${y * 100}%`);
          els.room.style.setProperty("--tilt-x", `${(0.5 - y) * 7}deg`);
          els.room.style.setProperty("--tilt-y", `${(x - 0.5) * 9}deg`);
          els.cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
          els.cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
        });
        addEventListener("pointerdown", () => els.cursor.classList.add("is-down"));
        addEventListener("pointerup", () => els.cursor.classList.remove("is-down"));
        document.querySelectorAll("button, input, textarea, .tarot-symbol img").forEach((target) => {
          target.addEventListener("pointerenter", () => els.cursor.classList.add("is-hover"));
          target.addEventListener("pointerleave", () => els.cursor.classList.remove("is-hover"));
        });
      }

      els.nextBtns.forEach((button) => button.addEventListener("click", () => {
        if (isSystemV1 && button.dataset.next === "idle") {
          resetExperience();
          renderAdaptiveHome();
          return;
        }
        els.room.dataset.step = button.dataset.next;
        syncRailNav();
      }));
      els.adaptiveHome?.addEventListener("click", handleHomeAction);
      els.modeBtns.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
      els.modeCards.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.modeCard)));
      els.input.addEventListener("input", updateModeRecommendation);
      els.modeRecommendationAccept?.addEventListener("click", () => {
        const recommendedMode = els.modeRecommendation.dataset.recommendedMode || "tarot";
        setMode(recommendedMode);
      });
      els.langBtns.forEach((btn) => btn.addEventListener("click", () => applyLanguage(btn.dataset.lang)));
      els.themeBtns.forEach((btn) => btn.addEventListener("click", () => applyTheme(btn.dataset.themeSetting)));
      els.questionExamples.addEventListener("click", (event) => {
        const button = event.target.closest("[data-question-example]");
        if (!button) return;
        els.input.value = button.textContent.trim();
        els.input.focus();
        updatePlaceholderSample(true);
        updateCastCopy();
      });
      els.spreadSelector.addEventListener("click", (event) => {
        const button = event.target.closest("[data-spread-type]");
        if (!button || mode !== "tarot") return;
        selectedSpreadType = button.dataset.spreadType || "single";
        updateSpreadSelector();
      });
      els.guaCastSelector.addEventListener("click", (event) => {
        const button = event.target.closest("[data-gua-cast]");
        if (!button || mode !== "meihua") return;
        selectedGuaCastMethod = button.dataset.guaCast || "time";
        updateGuaCastSelector();
        if (selectedGuaCastMethod !== "time") els.guaSeedInput.focus();
      });
      els.form.addEventListener("submit", runExperience);
      els.resultWorkflow?.addEventListener("click", (event) => {
        handleResultWorkflow(event);
        handleFailureAction(event);
      });
      els.actionInput?.addEventListener("input", () => {
        if (!lastRecord || !els.acceptAction) return;
        els.acceptAction.disabled = !lastRecord.selectedInsight || !els.actionInput.value.trim();
      });
      els.journeyView?.addEventListener("click", handleJourneyInteraction);
      els.actionStatus.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action-status]");
        if (!button) return;
        saveActionStatus(button.dataset.actionStatus);
      });
      els.reviewSave.addEventListener("click", saveReviewNote);
      els.historyBtn.addEventListener("click", () => {
        renderHistoryList();
        openUtilityPanel(els.historyPanel);
      });
      els.companionBtn.addEventListener("click", openCompanionPanel);
      els.historyFilters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-history-filter]");
        if (!button) return;
        historyFilter = button.dataset.historyFilter || "all";
        renderHistoryList();
      });
      els.weeklySummaryBtn.addEventListener("click", generateWeeklySummary);
      els.weeklySummaryCopy.addEventListener("click", copyWeeklySummary);
      els.weeklySummarySave.addEventListener("click", saveWeeklySummaryRecord);
      els.accountBtn.addEventListener("click", () => {
        updateAuthUi();
        renderSettings();
        openUtilityPanel(els.authPanel);
      });
      els.settingsView?.addEventListener("click", (event) => {
        handleSettingsInteraction(event).catch((error) => {
          console.error(error);
          settingsStatus("操作没有完成，请稍后再试。");
        });
      });
      els.settingsView?.addEventListener("change", (event) => {
        handleSettingsInteraction(event).catch((error) => console.error(error));
      });
      els.mobileRailMenu?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-mobile-panel]");
        if (!button) return;
        els.mobileRailMenu.open = false;
        if (button.dataset.mobilePanel === "history") els.historyBtn.click();
        if (button.dataset.mobilePanel === "companion") els.companionBtn.click();
        if (button.dataset.mobilePanel === "account") els.accountBtn.click();
      });
      els.utilityClosers.forEach((button) => button.addEventListener("click", closeUtilityPanels));
      els.historyList.addEventListener("click", (event) => {
        const favorite = event.target.closest("[data-history-favorite]");
        if (favorite) {
          toggleHistoryFavorite(favorite.dataset.historyFavorite);
          return;
        }
        const item = event.target.closest(".history-item");
        if (!item) return;
        const record = loadHistory(recordStore).find((entry) => entry.id === item.dataset.id);
        if (showStoredRecord(record)) closeUtilityPanels();
      });
      function openFollowupPanel() {
        els.followupPanel.hidden = false;
        updateFollowupSubmit();
        els.followupPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      document.querySelectorAll("[data-open-followup]").forEach((button) => {
        button.addEventListener("click", openFollowupPanel);
      });
      document.querySelectorAll("[data-quick-action]").forEach((button) => {
        button.addEventListener("click", () => {
          if (button.dataset.quickAction === "copy") els.copy.click();
          if (button.dataset.quickAction === "save") els.save.click();
        });
      });
      els.followupPanel.addEventListener("click", (event) => {
        const button = event.target.closest("[data-followup-question]");
        if (!button) return;
        const kind = button.dataset.followupQuestion;
        if (kind === "clarify-card") {
          drawClarificationCard();
          return;
        }
        selectedFollowupKind = "";
        els.followupCustomInput.value = "";
        els.followupPanel.querySelectorAll("[data-followup-question].is-selected").forEach((item) => item.classList.remove("is-selected"));
        updateFollowupSubmit();
        showFollowupAnswer(kind);
      });
      els.followupCustomInput.addEventListener("input", () => {
        if (els.followupCustomInput.value.trim()) {
          selectedFollowupKind = "";
          els.followupPanel.querySelectorAll("[data-followup-question].is-selected").forEach((item) => item.classList.remove("is-selected"));
        }
        updateFollowupSubmit();
      });
      els.followupCustomForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = els.followupCustomInput.value.trim();
        if (!selectedFollowupKind && !text) return;
        showFollowupAnswer(selectedFollowupKind || "custom", text);
      });
      els.followupEntryList.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-followup-copy]");
        if (!button || !lastRecord) return;
        const followup = (lastRecord.followups || []).find((item) => item.id === button.dataset.followupCopy);
        if (!followup) return;
        const text = [followup.question, cleanTaggedOutputText(followup.answer, "", { joinWith: "\n" })].filter(Boolean).join("\n");
        const result = await copyTextToClipboard(text);
        button.textContent = result === "manual" ? t("copyManual") : t("followupCopied");
      });
      els.historyClear.addEventListener("click", () => {
        clearAllRecords().catch((error) => {
          console.error(error);
          updateAuthUi(t("authFailed"));
        });
      });
      els.authForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitAuth("signin");
      });
      els.signup.addEventListener("click", () => submitAuth("signup"));
      els.passwordReset.addEventListener("click", requestPasswordReset);
      els.passwordUpdate.addEventListener("click", updatePasswordFromForm);
      els.signout.addEventListener("click", () => {
        syncClient.signOut();
        updateAuthUi();
      });
      els.back.addEventListener("click", () => {
        els.room.dataset.step = "compose";
      });
      els.reset.addEventListener("click", () => {
        resetExperience();
        renderAdaptiveHome();
      });
      els.ritualClose.addEventListener("click", () => {
        if (activeRitualCancel) activeRitualCancel();
      });
      els.again.addEventListener("click", () => {
        els.room.dataset.step = "compose";
        setTimeout(() => els.input.focus(), 80);
      });
      els.save.addEventListener("click", () => {
        renderHistoryList();
        els.save.textContent = t(lastRecord ? "savedHistory" : "saveHistory");
      });
      els.newReading.addEventListener("click", () => {
        if (isRunning) return;
        if (!confirm(t("newReadingConfirm"))) return;
        els.form.requestSubmit();
      });
      els.copy.addEventListener("click", async () => {
        if (!lastAction) return;
        const result = await copyTextToClipboard(lastAction);
        els.copy.textContent = result === "copied"
          ? copySuccessText("action")
          : result === "manual"
            ? t("copyManual")
            : t("copyFailed");
      });
      els.copySummary.addEventListener("click", async () => {
        const result = await copyShareText("summary");
        els.copySummary.textContent = result === "copied"
          ? copySuccessText("summary")
          : result === "manual"
            ? t("copyManual")
            : t("copyFailed");
      });
      els.copyFull.addEventListener("click", async () => {
        const result = await copyShareText("full");
        els.copyFull.textContent = result === "copied"
          ? copySuccessText("full")
          : result === "manual"
            ? t("copyManual")
            : t("copyFailed");
      });
      els.shareImage.addEventListener("click", async () => {
        await downloadShareImage();
        els.shareImage.textContent = t("imageSaved");
      });
      els.exportPdf.addEventListener("click", () => {
        els.exportPdf.textContent = exportResultPdf() ? t("exportOpened") : t("copyFailed");
      });
      els.createShareLink.addEventListener("click", createPrivateShareLink);
      els.revokeShareLink.addEventListener("click", revokePrivateShareLink);
      els.resonanceSubmit.addEventListener("click", submitCurrentToResonance);
      els.resonanceOpen.addEventListener("click", openResonancePool);
      els.resonanceRevoke.addEventListener("click", revokeCurrentResonance);
      els.resonanceList.addEventListener("click", reactToResonance);
      els.cardImage.addEventListener("click", openCardLightbox);
      els.cardImage.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCardLightbox();
        }
      });
      els.lightboxBackdrop.addEventListener("click", closeCardLightbox);
      els.lightboxClose.addEventListener("click", closeCardLightbox);
      addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeCardLightbox();
        }
      });

      function boot() {
        buildRitualDeck();
        applyTheme(document.documentElement.dataset.theme || "night", false);
        let savedLanguage = "zh";
        try { savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "zh"; } catch {}
        applyLanguage(savedLanguage);
        setMode("tarot");
        renderAdaptiveHome();
        renderHistoryList();
        updateAuthUi();
        initFieldCanvas();
        initPointerEffects();

        loadAdminConfig().then((loaded) => {
          if (loaded) refreshLocalizedUi();
        });
        handleSharedResult()
          .then((shared) => {
            if (shared) return;
            return handleAuthRedirect()
              .catch((error) => console.warn("Auth redirect skipped", error))
              .then(() => {
                syncAndRefresh().catch((error) => console.warn("Initial sync skipped", error));
              });
          });
      }

      boot();
      document.documentElement.dataset.appReady = "true";
