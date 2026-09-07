import { recall } from "../../memory/memory.js";
import { EXPERIMENT_USER_ID } from "./project-context.js";

// Mode A: no filtering at all — every seeded memory (relevant and
// irrelevant alike) goes straight into the context.
export async function buildFullContext(): Promise<{ context: string; memoryCount: number }> {
  const memories = await recall({ userId: EXPERIMENT_USER_ID });
  return {
    context: memories.map((m) => `- ${m.content}`).join("\n"),
    memoryCount: memories.length,
  };
}
