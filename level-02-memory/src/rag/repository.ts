import { query } from "../database/client.js";
import { toVectorLiteral } from "../memory/repository.js";

export interface DocumentChunk {
  id: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SimilarChunk extends DocumentChunk {
  similarity: number;
}

interface ChunkRow {
  id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function toDocumentChunk(row: ChunkRow): DocumentChunk {
  return {
    id: row.id,
    documentName: row.document_name,
    chunkIndex: row.chunk_index,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

// Called before re-ingesting a document so a re-chunk (different chunk
// size) doesn't leave stale chunks from the previous chunk count around.
export async function deleteChunksForDocument(documentName: string): Promise<void> {
  await query(`DELETE FROM document_chunks WHERE document_name = $1`, [documentName]);
}

export async function insertChunk(params: {
  documentName: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}): Promise<DocumentChunk> {
  const rows = await query<ChunkRow>(
    `INSERT INTO document_chunks (document_name, chunk_index, content, embedding, metadata)
     VALUES ($1, $2, $3, $4::vector, $5)
     RETURNING *`,
    [
      params.documentName,
      params.chunkIndex,
      params.content,
      toVectorLiteral(params.embedding),
      JSON.stringify(params.metadata ?? {}),
    ],
  );
  return toDocumentChunk(rows[0]);
}

export async function findSimilarChunks(params: {
  queryEmbedding: number[];
  topK: number;
}): Promise<SimilarChunk[]> {
  const rows = await query<ChunkRow & { similarity: number }>(
    `SELECT *, 1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [toVectorLiteral(params.queryEmbedding), params.topK],
  );
  return rows.map((row) => ({ ...toDocumentChunk(row), similarity: row.similarity }));
}
