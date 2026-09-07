import { searchSimilarMemories } from "../../vector/vector-search.js";
import { EXPERIMENT_USER_ID, TASK_PROMPT } from "./project-context.js";

// Mode B: real semantic search against the task text. minSimilarity=0
// deliberately — topK alone controls how much context this mode sends,
// so the topK sweep (§20) measures topK's effect in isolation.
export async function buildRetrievedContext(
  topK: number,
): Promise<{ context: string; retrievedCount: number; topSimilarity: number }> {
  const results = await searchSimilarMemories({
    userId: EXPERIMENT_USER_ID,
    queryText: TASK_PROMPT,
    topK,
    minSimilarity: 0,
  });
  return {
    context: results.map((m) => `- ${m.content}`).join("\n"),
    retrievedCount: results.length,
    topSimilarity: results[0]?.similarity ?? 0,
  };
}
