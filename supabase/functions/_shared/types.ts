// AskAura AI backend request and response contracts.
// Keep these aligned with callReadingApi() in index.html.
export type Orientation = "upright" | "reversed";
export type Language = "zh" | "en";

export type ReadingMode = "reading" | "advice" | "anchor" | "meihua-reading" | "clarify" | "followup" | "weekly-summary";

export interface LLMRuntimeOptions {
  provider?: "kimi" | "xiaomi" | "deepseek";
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export type ModelTier = "basic" | "pro";
export type ModelEntry = "tarot" | "meihua" | "dual" | "daily" | "followup" | "weekly";
export type ReflectionCategory = "state" | "relation" | "movement";
export type SpreadType = "single" | "reflection_triad";

export interface SpreadCard {
  id: string;
  category: ReflectionCategory;
  name: string;
  label: string;
  position: "single" | ReflectionCategory;
  coreMeaning: string;
  visibleLine: string;
  hiddenLine: string;
  reflectionQuestions: string[];
  actionSeeds: string[];
  prohibitedClaims: string[];
  meaningVersion: string;
}

export interface ModelRouteHints {
  tier?: ModelTier;
  entry?: ModelEntry;
}

export interface ReadingRequest {
  mode: "reading";
  deckVersion: "reflection-v1";
  cardName: string;
  spreadType: SpreadType;
  cards: SpreadCard[];
  intent: string;
  question: string;
  round: number;
  sessionHistory: string;
  language: Language;
}

export interface AdviceRequest {
  mode: "advice";
  cardName: string;
  orientation: Orientation;
  intent: string;
  question: string;
  sessionSummary: string;
  language: Language;
}

export interface AnchorRequest {
  mode: "anchor";
  cardName: string;
  orientation: Orientation;
  language: Language;
}

export interface MeihuaReadingRequest {
  mode: "meihua-reading";
  guaName: string;
  intent: string;
  question: string;
  language: Language;
}

export interface ClarifyRequest {
  mode: "clarify";
  question: string;
  round?: number;
  language: Language;
}

export interface FollowupRequest {
  mode: "followup";
  originalQuestion: string;
  resultSummary: string;
  followupQuestion: string;
  language: Language;
}

export interface WeeklySummaryRecord {
  mode: string;
  title: string;
  question: string;
  summary: string;
  action: string;
  actionStatus?: string;
  reviewNote?: string;
  createdAt: string;
}

export interface WeeklySummaryRequest {
  mode: "weekly-summary";
  records: WeeklySummaryRecord[];
  language: Language;
}

export type AnyReadingRequest = (
  ReadingRequest | AdviceRequest | AnchorRequest | MeihuaReadingRequest | ClarifyRequest | FollowupRequest | WeeklySummaryRequest
) & {
  llm?: LLMRuntimeOptions;
  tier?: ModelTier;
  entry?: ModelEntry;
};

export interface DrawEvent {
  card: string;
  orientation: Orientation;
  intent: string;
  question: string;
}

export interface ReadingResponse {
  text: string;
}

export interface ErrorResponse {
  error: string;
}
