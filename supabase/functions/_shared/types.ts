// 此镜（RiLL）AI 后端类型定义
// 与前端 index.html 的 callReadingApi() 调用契约严格对齐。

export type Orientation = "upright" | "reversed";
export type Language = "zh" | "en";

export type ReadingMode = "reading" | "advice" | "anchor" | "meihua-reading" | "clarify";

export interface LLMRuntimeOptions {
  provider?: "kimi" | "xiaomi";
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ReadingRequest {
  mode: "reading";
  cardName: string;
  orientation: Orientation;
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
  guaName: string;       // "乾" / "坤" / ...
  intent: string;
  question: string;
  language: "zh" | "en";
}

export interface ClarifyRequest {
  mode: "clarify";
  question: string;
  round?: number;
  language: Language;
}

export type AnyReadingRequest = (
  ReadingRequest | AdviceRequest | AnchorRequest | MeihuaReadingRequest | ClarifyRequest
) & {
  llm?: LLMRuntimeOptions;
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
