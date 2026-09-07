import "dotenv/config";
import { executeToolCall, type ToolDefinition } from "../../level-01-single-agent/src/agent.js";
import type { ToolCallRequest } from "../../level-01-single-agent/src/llm.js";
import { connect, close, query } from "./database/client.js";
import { remember, recall, updateMemory, forget } from "./memory/memory.js";
import { DEFAULT_USER_ID } from "./memory/types.js";
import { rememberTool } from "./tools/remember.js";
import { recallTool } from "./tools/recall.js";

function check(label: string, condition: boolean) {
  console.log(`[${condition ? "PASS" : "FAIL"}] ${label}`);
}

async function main() {
  await connect();

  console.log("\n--- remember() ---");
  const created = await remember({
    userId: DEFAULT_USER_ID,
    category: "preference",
    content: "The user prefers TypeScript.",
  });
  check("remember() returns a created memory with an id", Boolean(created.id));

  console.log("\n--- recall() finds it ---");
  const recalled = await recall({ userId: DEFAULT_USER_ID, category: "preference" });
  check("recall() finds the just-created memory", recalled.some((m) => m.id === created.id));

  console.log("\n--- updateMemory() ---");
  const updated = await updateMemory({ id: created.id, content: "The user prefers Go now." });
  check("updateMemory() updates content", updated?.content === "The user prefers Go now.");

  console.log("\n--- recall() reflects the update ---");
  const recalledAfterUpdate = await recall({ userId: DEFAULT_USER_ID, category: "preference" });
  check(
    "recall() reflects the update",
    recalledAfterUpdate.find((m) => m.id === created.id)?.content === "The user prefers Go now.",
  );

  console.log("\n--- recall() on an empty category ---");
  const emptyResult = await recall({ userId: DEFAULT_USER_ID, category: "task_state" });
  check("recall() on a category with nothing returns an empty array", emptyResult.length === 0);

  console.log("\n--- forget() ---");
  const deleted = await forget(created.id);
  check("forget() deletes the memory", deleted === true);

  console.log("\n--- recall() no longer finds it ---");
  const recalledAfterDelete = await recall({ userId: DEFAULT_USER_ID, category: "preference" });
  check(
    "recall() no longer finds the deleted memory",
    !recalledAfterDelete.some((m) => m.id === created.id),
  );

  console.log("\n--- forget() on an already-deleted id ---");
  const deletedAgain = await forget(created.id);
  check("forget() on a nonexistent id returns false instead of throwing", deletedAgain === false);

  console.log("\n--- remember() generates and stores a real embedding ---");
  const withEmbedding = await remember({
    userId: DEFAULT_USER_ID,
    category: "technical_knowledge",
    content: "Embeddings test fact.",
  });
  const embeddingCheck = await query<{ has_embedding: boolean }>(
    "SELECT embedding IS NOT NULL AS has_embedding FROM memories WHERE id = $1",
    [withEmbedding.id],
  );
  check("remember() stores a real embedding for the content", embeddingCheck[0]?.has_embedding === true);
  await forget(withEmbedding.id);

  console.log("\n--- remember tool: invalid category (Zod validation at the tool boundary) ---");
  const toolsByName = new Map<string, ToolDefinition<any>>([
    [rememberTool.name, rememberTool],
    [recallTool.name, recallTool],
  ]);
  const badCall: ToolCallRequest = {
    id: "test-call",
    type: "function",
    function: {
      name: "remember",
      arguments: JSON.stringify({ category: "not_a_real_category", content: "test" }),
    },
  };
  const badResult = await executeToolCall(badCall, toolsByName);
  check("invalid category is rejected before touching the database", badResult.includes("invalid arguments"));

  console.log("\n--- recall tool: no relevant memory found ---");
  const emptyRecallCall: ToolCallRequest = {
    id: "test-call",
    type: "function",
    function: { name: "recall", arguments: JSON.stringify({ category: "task_state" }) },
  };
  const emptyRecallResult = await executeToolCall(emptyRecallCall, toolsByName);
  check(
    'recall on an empty category returns "No relevant memory found."',
    emptyRecallResult === "No relevant memory found.",
  );

  await close();
}

main().catch((err) => {
  console.error("test run failed:", err);
  process.exit(1);
});
