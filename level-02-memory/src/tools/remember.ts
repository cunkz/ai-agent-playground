import { z } from "zod";
import type { ToolDefinition } from "../../../level-01-single-agent/src/agent.js";
import { remember } from "../memory/memory.js";
import { MemoryCategory, DEFAULT_USER_ID } from "../memory/types.js";

const RememberArgs = z.object({
  category: MemoryCategory,
  content: z.string(),
});
type RememberArgs = z.infer<typeof RememberArgs>;

export const rememberTool: ToolDefinition<RememberArgs> = {
  name: "remember",
  description:
    "Persist a fact about the user or project so it can be recalled in future conversations, " +
    "even after this process restarts. Use only when the user explicitly asks you to remember " +
    "something, not automatically for every statement they make.",
  parameters: {
    type: "object",
    properties: {
      category: { type: "string", enum: MemoryCategory.options },
      content: { type: "string", description: "The fact to remember, in plain language." },
    },
    required: ["category", "content"],
  },
  schema: RememberArgs,
  execute: async ({ category, content }) => {
    const memory = await remember({ userId: DEFAULT_USER_ID, category, content });
    return `Remembered (id=${memory.id}): ${memory.content}`;
  },
};
