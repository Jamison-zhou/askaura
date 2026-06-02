// 校验 LLM 输出是否含所有必需 token。
// 不齐 → 上层 retry 一次；再不齐 → 返回 error 给前端。

import type { ReadingMode } from "./types.ts";

const REQUIRED_TOKENS: Record<ReadingMode, string[]> = {
  reading: ["CORE_QUESTION", "TENSION", "JUDGMENT", "ACTION"],
  advice: ["ACTION"],
  anchor: [
    "ANCHOR_CORE",
    "ANCHOR_COLOR",
    "ANCHOR_OBJECT",
    "ANCHOR_MOMENT",
    "ANCHOR_TAKEAWAY",
  ],
  "meihua-reading": ["ACTION"],
  clarify: ["CLARIFIED_QUESTION", "CLARIFY_NOTE"],
};

const TOKEN_REGEX = /^\s*\[([A-Z][A-Z0-9_]*)\]/;

export interface ValidationResult {
  ok: boolean;
  missing: string[];
  found: string[];
}

export function validateTokens(
  text: string,
  mode: ReadingMode,
): ValidationResult {
  const found = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(TOKEN_REGEX);
    if (m) found.add(m[1]);
  }
  const required = REQUIRED_TOKENS[mode];
  const missing = required.filter((t) => !found.has(t));
  return {
    ok: missing.length === 0,
    missing,
    found: [...found],
  };
}

export function buildRetryHint(missing: string[]): string {
  return `上一次输出缺了 [${
    missing.join("] [")
  }]。请严格按之前的格式重写一遍，每个 token 单独一行，方括号在行首。`;
}
