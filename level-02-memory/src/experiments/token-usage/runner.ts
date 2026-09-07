import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { connect, close } from "../../database/client.js";
import { chatCompletion, LlmApiError } from "../../../../level-01-single-agent/src/llm.js";
import { seedProjectContext, ALL_SEED_FACTS, TASK_PROMPT } from "./project-context.js";
import { buildFullContext } from "./full-context.js";
import { buildRetrievedContext } from "./memory-retrieval.js";
import { buildPoorContext } from "./poor-retrieval.js";
import { summarizeMode, reductionPercent, estimateCost } from "./metrics.js";
import type { TrialResult } from "./types.js";

const TRIALS_PER_MODE = 5;
const MAIN_TOP_K = 5;
const RESULTS_DIR = path.join(import.meta.dirname, "..", "..", "..", "experiments", "results");

const SYSTEM_PROMPT =
  "You are a senior backend engineer working on this project. Use the provided project " +
  "context to complete the task, following existing conventions exactly. If no context is " +
  "provided, do the best you can with general best practices.";

async function runTrial(
  mode: TrialResult["mode"],
  trialIndex: number,
  context: string,
  retrievedMemoryCount: number,
  topK?: number,
): Promise<TrialResult> {
  // The gateway caches identical requests (confirmed: byte-identical
  // responses and ~100ms latency on repeat calls with no marker). This
  // trailing marker forces each trial to be a genuinely fresh generation
  // rather than a cache hit, at the cost of a few extra input tokens
  // (applied identically across all modes, so relative comparisons stay
  // fair).
  const userMessage = context
    ? `Project context:\n${context}\n\nTask: ${TASK_PROMPT}\n\n(Ignore this line; internal trial marker: ${randomUUID()})`
    : `Task: ${TASK_PROMPT}\n\n(Ignore this line; internal trial marker: ${randomUUID()})`;

  const start = Date.now();
  const response = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    [],
  );
  const latencyMs = Date.now() - start;

  const result: TrialResult = {
    mode,
    trialIndex,
    taskId: "preferences-api",
    model: process.env.LLM_MODEL ?? "unknown",
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    totalTokens: response.usage.prompt_tokens + response.usage.completion_tokens,
    retrievedMemoryCount,
    contextCharacters: context.length,
    latencyMs,
    timestamp: new Date().toISOString(),
    responseText: response.choices[0].message.content ?? "",
    topK,
  };

  console.log(
    `[Experiment] mode=${mode} trial=${trialIndex}${topK ? ` topK=${topK}` : ""} ` +
      `inputTokens=${result.inputTokens} outputTokens=${result.outputTokens} latency=${latencyMs}ms`,
  );
  return result;
}

async function main() {
  await connect();
  await seedProjectContext();

  const mainResults: TrialResult[] = [];

  console.log("\n=== Mode A: Full Context ===");
  const { context: fullContext, memoryCount } = await buildFullContext();
  for (let i = 1; i <= TRIALS_PER_MODE; i++) {
    mainResults.push(await runTrial("full_context", i, fullContext, memoryCount));
  }

  console.log("\n=== Mode B: Memory + Retrieval (topK=5) ===");
  for (let i = 1; i <= TRIALS_PER_MODE; i++) {
    const { context, retrievedCount } = await buildRetrievedContext(MAIN_TOP_K);
    mainResults.push(await runTrial("memory_retrieval", i, context, retrievedCount, MAIN_TOP_K));
  }

  console.log("\n=== Mode C: Poor Retrieval (topK=5) ===");
  for (let i = 1; i <= TRIALS_PER_MODE; i++) {
    const { context, retrievedCount } = await buildPoorContext(MAIN_TOP_K);
    mainResults.push(await runTrial("poor_retrieval", i, context, retrievedCount, MAIN_TOP_K));
  }

  console.log("\n=== Top-K sweep (Mode B, topK=3 and topK=10, 3 trials each) ===");
  const topKSweepResults: TrialResult[] = [];
  for (const topK of [3, 10]) {
    for (let i = 1; i <= 3; i++) {
      const { context, retrievedCount } = await buildRetrievedContext(topK);
      topKSweepResults.push(await runTrial("memory_retrieval", i, context, retrievedCount, topK));
    }
  }

  const summaries = {
    full_context: summarizeMode("full_context", mainResults.filter((r) => r.mode === "full_context")),
    memory_retrieval: summarizeMode(
      "memory_retrieval",
      mainResults.filter((r) => r.mode === "memory_retrieval"),
    ),
    poor_retrieval: summarizeMode("poor_retrieval", mainResults.filter((r) => r.mode === "poor_retrieval")),
  };

  const topKSweepSummaries = {
    topK3: summarizeMode("memory_retrieval_topK3", topKSweepResults.filter((r) => r.topK === 3)),
    topK5: summarizeMode(
      "memory_retrieval_topK5",
      mainResults.filter((r) => r.mode === "memory_retrieval"),
    ),
    topK10: summarizeMode("memory_retrieval_topK10", topKSweepResults.filter((r) => r.topK === 10)),
  };

  const inputReduction = reductionPercent(summaries.full_context.avgInputTokens, summaries.memory_retrieval.avgInputTokens);
  const totalReduction = reductionPercent(summaries.full_context.avgTotalTokens, summaries.memory_retrieval.avgTotalTokens);

  const fullContextCost = estimateCost(summaries.full_context.avgInputTokens, summaries.full_context.avgOutputTokens);
  const memoryRetrievalCost = estimateCost(
    summaries.memory_retrieval.avgInputTokens,
    summaries.memory_retrieval.avgOutputTokens,
  );

  const output = {
    generatedAt: new Date().toISOString(),
    model: process.env.LLM_MODEL,
    taskPrompt: TASK_PROMPT,
    seedMemoryCount: ALL_SEED_FACTS.length,
    trialsPerMode: TRIALS_PER_MODE,
    mainTopK: MAIN_TOP_K,
    summaries,
    topKSweepSummaries,
    inputTokenReductionPercent: inputReduction,
    totalTokenReductionPercent: totalReduction,
    fullContextCost,
    memoryRetrievalCost,
    mainResults,
    topKSweepResults,
  };

  await mkdir(RESULTS_DIR, { recursive: true });
  const resultsPath = path.join(RESULTS_DIR, "token-usage-results.json");
  await writeFile(resultsPath, JSON.stringify(output, null, 2));

  console.log("\n=== Summary ===");
  console.table({
    "Full Context": summaries.full_context,
    "Memory + Retrieval": summaries.memory_retrieval,
    "Poor Retrieval": summaries.poor_retrieval,
  });
  console.log(`\nInput token reduction (Memory+Retrieval vs Full Context): ${inputReduction.toFixed(1)}%`);
  console.log(`Total token reduction: ${totalReduction.toFixed(1)}%`);
  console.log(`\nResults saved to: ${resultsPath}`);

  await close();
}

main().catch((error) => {
  if (error instanceof LlmApiError) {
    console.error(`\nLLM API request failed (HTTP ${error.status}):`);
    console.error(JSON.stringify(error.body, null, 2));
  } else {
    console.error("\nexperiment failed:");
    console.error(error);
  }
  process.exit(1);
});
