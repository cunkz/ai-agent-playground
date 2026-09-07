-- Migration: 003_add_memory_embeddings
-- Purpose: Add a vector column to `memories` for semantic similarity search
--          (Level 2, Phase D).
-- WARNING: This migration changes the database schema.
--
-- Dimension confirmed 2026-09-07 by calling the embedding endpoint
-- (EMBEDDING_BASE_URL / EMBEDDING_MODEL=Qwen3-Embedding-8B in .env) and
-- reading response.data[0].embedding.length directly — not assumed from
-- the model's name or from what other providers typically use.
--
-- If EMBEDDING_MODEL ever changes, re-probe before assuming this number
-- still applies — a different model will very likely have a different
-- output dimension, and pgvector cannot resize a vector column in place
-- (changing it means dropping and re-adding the column and re-embedding
-- every stored memory).
--
-- Dependencies: 002_enable_pgvector.sql must already be applied.

ALTER TABLE memories ADD COLUMN embedding vector(4096);
