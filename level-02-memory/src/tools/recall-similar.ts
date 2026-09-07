import { z } from "zod";
import type { ToolDefinition } from "../../../level-01-single-agent/src/agent.js";
import { searchSimilarMemories } from "../vector/vector-search.js";
import { DEFAULT_USER_ID } from "../memory/types.js";

const RecallSimilarArgs = z.object({
  query: z.string(),
  topK: z.number().int().positive().optional(),
});
type RecallSimilarArgs = z.infer<typeof RecallSimilarArgs>;

export const recallSimilarTool: ToolDefinition<RecallSimilarArgs> = {
  name: "recallSimilar",
  description:
    "Search remembered facts by meaning rather than an exact category match. Use this " +
    "whenever recall() returns 'No relevant memory found', or when you don't know which " +
    "category a fact might have been stored under.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "What you're trying to find, in plain language." },
      topK: { type: "number", description: "Maximum number of results to return (default 3)." },
    },
    required: ["query"],
  },
  schema: RecallSimilarArgs,
  execute: async ({ query, topK }) => {
    const results = await searchSimilarMemories({
      userId: DEFAULT_USER_ID,
      queryText: query,
      topK: topK ?? 3,
      minSimilarity: 0.3,
    });
    if (results.length === 0) return "No relevant memory found.";
    return results
      .map((m) => `[${m.category}] ${m.content} (similarity=${m.similarity.toFixed(2)})`)
      .join("\n");
  },
};
