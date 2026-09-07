-- Migration: 005_create_document_chunks
-- Purpose: Create storage for chunked local documents, for RAG retrieval
--          (Level 2, Phase F).
-- WARNING: This migration changes the database schema.
--
-- Design notes:
--   - This is a separate table from `memories`, not a reuse of it — chunks
--     are facts *about documents*, retrieved differently (by document
--     ingestion, not remember()/recall()) and conceptually distinct from
--     agent memory (see knowledge/architecture.md's own discussion of the
--     memory-vs-RAG distinction once Phase F's README section covers it).
--   - document_name + chunk_index identify a chunk's position within a
--     source document; content is the chunk's raw text.
--   - embedding vector(4096): same dimension as `memories.embedding`,
--     because ingestion reuses the same embedding model/gateway
--     (EMBEDDING_MODEL=Qwen3-Embedding-8B, confirmed dimension from
--     migration 003 — not re-guessed here since it's the same model).
--   - No ivfflat/hnsw index, for the same reason as migration 004: 4096
--     dimensions exceeds pgvector's index caps (2000 for vector, 4000 for
--     halfvec). Retrieval will use the same exact cosine-distance scan
--     approach as memories.
--   - UNIQUE (document_name, chunk_index): lets ingestion be re-run
--     idempotently via INSERT ... ON CONFLICT ... DO UPDATE, rather than
--     accumulating duplicate chunks on every re-ingestion (a direct
--     lesson from the duplicate-remember() issue observed in Phase B/E).

CREATE TABLE document_chunks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name  TEXT NOT NULL,
  chunk_index    INT NOT NULL,
  content        TEXT NOT NULL,
  embedding      vector(4096),
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_document_chunks_doc_chunk ON document_chunks (document_name, chunk_index);
