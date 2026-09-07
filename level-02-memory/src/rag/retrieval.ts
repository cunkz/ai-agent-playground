import { embed } from "../embeddings/embeddings.js";
import * as repository from "./repository.js";
import type { SimilarChunk } from "./repository.js";

export async function retrieveRelevantChunks(params: {
  queryText: string;
  topK?: number;
  minSimilarity?: number;
}): Promise<SimilarChunk[]> {
  const topK = params.topK ?? 3;
  const minSimilarity = params.minSimilarity ?? 0.3;

  const queryEmbedding = await embed(params.queryText);
  const results = await repository.findSimilarChunks({ queryEmbedding, topK });
  const filtered = results.filter((r) => r.similarity >= minSimilarity);

  console.log(`[RAG] query="${params.queryText}"`);
  console.log(`[RAG] retrieved=${results.length} aboveThreshold=${filtered.length}`);
  console.log(`[RAG] topSimilarity=${results[0]?.similarity.toFixed(3) ?? "n/a"}`);

  return filtered;
}
