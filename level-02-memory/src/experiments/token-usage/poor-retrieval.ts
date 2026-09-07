import { query } from "../../database/client.js";
import { EXPERIMENT_USER_ID } from "./project-context.js";

interface MemoryRow {
  content: string;
}

// Mode C: deliberately retrieves only the memories tagged irrelevant at
// seed time (metadata.relevant = false) — an intentional bad-retrieval
// simulation, not a real similarity search gone wrong.
export async function buildPoorContext(topK: number): Promise<{ context: string; retrievedCount: number }> {
  const rows = await query<MemoryRow>(
    `SELECT content FROM memories
     WHERE user_id = $1 AND (metadata->>'relevant')::boolean = false
     ORDER BY created_at
     LIMIT $2`,
    [EXPERIMENT_USER_ID, topK],
  );
  return {
    context: rows.map((r) => `- ${r.content}`).join("\n"),
    retrievedCount: rows.length,
  };
}
