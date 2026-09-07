import { embed } from "../embeddings/embeddings.js";
import * as repository from "../memory/repository.js";
import type { SimilarMemory } from "../memory/repository.js";

export async function storeEmbedding(id: string, content: string): Promise<boolean> {
  const embedding = await embed(content);
  return repository.updateMemoryEmbedding(id, embedding);
}

// Backfills embeddings for any memories created before Phase C's embedding
// generation existed (or created while the embedding service was down).
export async function backfillMissingEmbeddings(userId: string): Promise<number> {
  const missing = await repository.findMemoriesMissingEmbedding(userId);
  for (const memory of missing) {
    await storeEmbedding(memory.id, memory.content);
  }
  console.log(`[Memory] backfilled embeddings for ${missing.length} memories`);
  return missing.length;
}

export async function searchSimilarMemories(params: {
  userId: string;
  queryText: string;
  topK?: number;
  minSimilarity?: number;
}): Promise<SimilarMemory[]> {
  const topK = params.topK ?? 3;
  const minSimilarity = params.minSimilarity ?? 0.3;

  const queryEmbedding = await embed(params.queryText);
  const results = await repository.findSimilarMemories({
    userId: params.userId,
    queryEmbedding,
    topK,
  });
  const filtered = results.filter((r) => r.similarity >= minSimilarity);

  console.log(`[Memory] query="${params.queryText}"`);
  console.log(`[Memory] retrieved=${results.length} aboveThreshold=${filtered.length}`);
  console.log(`[Memory] topSimilarity=${results[0]?.similarity.toFixed(3) ?? "n/a"}`);

  return filtered;
}
