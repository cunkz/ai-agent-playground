import { query } from "../database/client.js";
import type { Memory, MemoryCategory } from "./types.js";

interface MemoryRow {
  id: string;
  user_id: string;
  category: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// pgvector accepts its text input format directly: "[0.1,0.2,...]". No
// pgvector npm package needed just for this — it's one line of formatting.
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category as MemoryCategory,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertMemory(params: {
  userId: string;
  category: MemoryCategory;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}): Promise<Memory> {
  const rows = await query<MemoryRow>(
    `INSERT INTO memories (user_id, category, content, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)
     RETURNING *`,
    [
      params.userId,
      params.category,
      params.content,
      JSON.stringify(params.metadata ?? {}),
      params.embedding ? toVectorLiteral(params.embedding) : null,
    ],
  );
  return toMemory(rows[0]);
}

export async function findMemories(params: {
  userId: string;
  category?: MemoryCategory;
}): Promise<Memory[]> {
  const rows = params.category
    ? await query<MemoryRow>(
        `SELECT * FROM memories WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC`,
        [params.userId, params.category],
      )
    : await query<MemoryRow>(
        `SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC`,
        [params.userId],
      );
  return rows.map(toMemory);
}

export async function updateMemoryContent(params: {
  id: string;
  content: string;
}): Promise<Memory | null> {
  const rows = await query<MemoryRow>(
    `UPDATE memories SET content = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [params.id, params.content],
  );
  return rows[0] ? toMemory(rows[0]) : null;
}

export interface SimilarMemory extends Memory {
  similarity: number;
}

export async function findSimilarMemories(params: {
  userId: string;
  queryEmbedding: number[];
  topK: number;
}): Promise<SimilarMemory[]> {
  // `<=>` is pgvector's cosine distance operator (0 = identical direction,
  // up to 2 = opposite). `1 - distance` converts it to a similarity score
  // where higher means more similar, matching how the curriculum expects
  // similarity to be discussed (threshold "similarity >= X").
  const rows = await query<MemoryRow & { similarity: number }>(
    `SELECT *, 1 - (embedding <=> $1::vector) AS similarity
     FROM memories
     WHERE user_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [toVectorLiteral(params.queryEmbedding), params.userId, params.topK],
  );
  return rows.map((row) => ({ ...toMemory(row), similarity: row.similarity }));
}

export async function findMemoriesMissingEmbedding(userId: string): Promise<Memory[]> {
  const rows = await query<MemoryRow>(`SELECT * FROM memories WHERE user_id = $1 AND embedding IS NULL`, [
    userId,
  ]);
  return rows.map(toMemory);
}

export async function updateMemoryEmbedding(id: string, embedding: number[]): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE memories SET embedding = $2::vector WHERE id = $1 RETURNING id`,
    [id, toVectorLiteral(embedding)],
  );
  return rows.length > 0;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM memories WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}
