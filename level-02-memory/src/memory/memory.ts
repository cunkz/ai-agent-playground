import { embed } from "../embeddings/embeddings.js";
import * as repository from "./repository.js";
import type { Memory, MemoryCategory } from "./types.js";

export async function remember(params: {
  userId: string;
  category: MemoryCategory;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<Memory> {
  console.log(`[Memory] remember userId=${params.userId} category=${params.category}`);

  // Embedding generation is a nice-to-have on top of the core fact being
  // stored, not a precondition for it. If the embedding service is down,
  // the memory is still saved (without an embedding) rather than lost.
  let embedding: number[] | undefined;
  try {
    embedding = await embed(params.content);
    console.log(`[Memory] embedding generated, dimension=${embedding.length}`);
  } catch (err) {
    console.log(
      `[Memory] embedding generation failed, storing without embedding: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return repository.insertMemory({ ...params, embedding });
}

export async function recall(params: {
  userId: string;
  category?: MemoryCategory;
}): Promise<Memory[]> {
  const memories = await repository.findMemories(params);
  console.log(
    `[Memory] recall userId=${params.userId} category=${params.category ?? "any"} retrieved=${memories.length}`,
  );
  return memories;
}

export async function updateMemory(params: { id: string; content: string }): Promise<Memory | null> {
  console.log(`[Memory] updateMemory id=${params.id}`);
  const updated = await repository.updateMemoryContent(params);
  if (!updated) console.log(`[Memory] updateMemory id=${params.id} not found`);
  return updated;
}

export async function forget(id: string): Promise<boolean> {
  console.log(`[Memory] forget id=${id}`);
  const deleted = await repository.deleteMemory(id);
  if (!deleted) console.log(`[Memory] forget id=${id} not found`);
  return deleted;
}
