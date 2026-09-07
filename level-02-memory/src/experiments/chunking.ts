import "dotenv/config";
import { connect, close } from "../database/client.js";
import { ingestKnowledgeBase } from "../rag/ingestion.js";
import { retrieveRelevantChunks } from "../rag/retrieval.js";

// Deliberately targets a fact buried mid-paragraph in database.md, not a
// document's opening sentence — so chunk boundaries actually matter to
// whether the relevant sentence ends up isolated, diluted, or split.
const QUESTION = "Why doesn't the memories table use an ivfflat or hnsw index?";

async function runWithChunkSize(size: number) {
  console.log(`\n\n========== chunk size = ${size} words ==========`);
  await ingestKnowledgeBase(size);
  const results = await retrieveRelevantChunks({ queryText: QUESTION, topK: 3, minSimilarity: 0 });
  results.forEach((r) =>
    console.log(
      `  similarity=${r.similarity.toFixed(3)}  [${r.documentName} #${r.chunkIndex}, ${r.content.split(/\s+/).length} words]\n    "${r.content.slice(0, 200)}${r.content.length > 200 ? "..." : ""}"`,
    ),
  );
}

async function main() {
  await connect();
  for (const size of [20, 120, 600]) {
    await runWithChunkSize(size);
  }
  await close();
}

main().catch((err) => {
  console.error("chunking experiment failed:", err);
  process.exit(1);
});
