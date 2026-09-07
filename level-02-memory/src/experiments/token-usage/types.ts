export interface TrialResult {
  mode: "full_context" | "memory_retrieval" | "poor_retrieval";
  trialIndex: number;
  taskId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  retrievedMemoryCount: number;
  contextCharacters: number;
  latencyMs: number;
  timestamp: string;
  responseText: string;
  topK?: number;
}

export interface ModeSummary {
  mode: string;
  trials: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgTotalTokens: number;
  avgRetrievedMemoryCount: number;
  avgLatencyMs: number;
  avgContextCharacters: number;
}
