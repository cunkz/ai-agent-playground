import type { TrialResult, ModeSummary } from "./types.js";

export function summarizeMode(mode: string, trials: TrialResult[]): ModeSummary {
  const n = trials.length;
  const avg = (fn: (t: TrialResult) => number) => trials.reduce((sum, t) => sum + fn(t), 0) / n;
  return {
    mode,
    trials: n,
    avgInputTokens: avg((t) => t.inputTokens),
    avgOutputTokens: avg((t) => t.outputTokens),
    avgTotalTokens: avg((t) => t.totalTokens),
    avgRetrievedMemoryCount: avg((t) => t.retrievedMemoryCount),
    avgLatencyMs: avg((t) => t.latencyMs),
    avgContextCharacters: avg((t) => t.contextCharacters),
  };
}

export function reductionPercent(baseline: number, comparison: number): number {
  if (baseline === 0) return 0;
  return ((baseline - comparison) / baseline) * 100;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

// Returns null (not zero) when pricing isn't configured, so the report can
// honestly say "pricing unavailable" instead of implying $0 cost.
export function estimateCost(inputTokens: number, outputTokens: number): CostEstimate | null {
  const inputPrice = process.env.MODEL_INPUT_PRICE_PER_1M_TOKENS;
  const outputPrice = process.env.MODEL_OUTPUT_PRICE_PER_1M_TOKENS;
  if (!inputPrice || !outputPrice) return null;

  const inputCost = (inputTokens / 1_000_000) * Number(inputPrice);
  const outputCost = (outputTokens / 1_000_000) * Number(outputPrice);
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}
