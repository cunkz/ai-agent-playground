import "dotenv/config";
import { connect, close } from "../database/client.js";
import { remember, recall } from "../memory/memory.js";
import { searchSimilarMemories, backfillMissingEmbeddings } from "../vector/vector-search.js";
import { DEFAULT_USER_ID } from "../memory/types.js";
import type { MemoryCategory } from "../memory/types.js";

// The curriculum's own example set (§22-23 of AI_AGENT_PLAYGROUND.md).
const FACTS: { category: MemoryCategory; content: string }[] = [
  { category: "preference", content: "The user likes backend development." },
  { category: "technical_knowledge", content: "The user frequently works with Go." },
  { category: "technical_knowledge", content: "The user uses PostgreSQL." },
  { category: "preference", content: "The user is interested in software architecture." },
  { category: "preference", content: "The user's favorite color is blue." }, // deliberately irrelevant control
];

async function ensureFactsStored(): Promise<void> {
  const existing = await recall({ userId: DEFAULT_USER_ID });
  const existingContents = new Set(existing.map((m) => m.content));
  for (const fact of FACTS) {
    if (existingContents.has(fact.content)) continue;
    await remember({ userId: DEFAULT_USER_ID, category: fact.category, content: fact.content });
  }
}

async function main() {
  await connect();

  await ensureFactsStored();
  const backfilled = await backfillMissingEmbeddings(DEFAULT_USER_ID);
  console.log(`(backfilled ${backfilled} pre-existing memories missing embeddings)`);

  const queryText = "What technology is the user likely to use for backend services?";
  console.log(`\nQuery: "${queryText}"`);

  console.log("\n\n========== Top-K experiment (minSimilarity=0, i.e. no filtering) ==========");
  for (const topK of [1, 3, 5]) {
    console.log(`\n--- topK=${topK} ---`);
    const results = await searchSimilarMemories({
      userId: DEFAULT_USER_ID,
      queryText,
      topK,
      minSimilarity: 0,
    });
    results.forEach((r) => console.log(`  similarity=${r.similarity.toFixed(3)}  [${r.category}] ${r.content}`));
  }

  console.log("\n\n========== Similarity threshold experiment (topK=10, i.e. no cap) ==========");
  for (const minSimilarity of [0.0, 0.3, 0.55, 0.9]) {
    console.log(`\n--- minSimilarity=${minSimilarity} ---`);
    const results = await searchSimilarMemories({
      userId: DEFAULT_USER_ID,
      queryText,
      topK: 10,
      minSimilarity,
    });
    console.log(`  ${results.length} memories passed the threshold`);
    results.forEach((r) => console.log(`  similarity=${r.similarity.toFixed(3)}  [${r.category}] ${r.content}`));
  }

  await close();
}

main().catch((err) => {
  console.error("experiment failed:", err);
  process.exit(1);
});
