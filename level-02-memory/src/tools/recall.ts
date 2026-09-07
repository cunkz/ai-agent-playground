import { z } from "zod";
import type { ToolDefinition } from "../../../level-01-single-agent/src/agent.js";
import { recall } from "../memory/memory.js";
import { MemoryCategory, DEFAULT_USER_ID } from "../memory/types.js";

const RecallArgs = z.object({
  category: MemoryCategory.optional(),
});
type RecallArgs = z.infer<typeof RecallArgs>;

export const recallTool: ToolDefinition<RecallArgs> = {
  name: "recall",
  description:
    "Retrieve previously remembered facts about the user or project. Optionally filter by " +
    "category; omit it to retrieve everything remembered so far. If this returns 'No " +
    "relevant memory found', the fact may exist under a different category than you " +
    "guessed — try recallSimilar instead before concluding nothing is known.",
  parameters: {
    type: "object",
    properties: {
      category: { type: "string", enum: MemoryCategory.options },
    },
    required: [],
  },
  schema: RecallArgs,
  execute: async ({ category }) => {
    const memories = await recall({ userId: DEFAULT_USER_ID, category });
    if (memories.length === 0) return "No relevant memory found.";
    return memories.map((m) => `[${m.category}] ${m.content}`).join("\n");
  },
};
