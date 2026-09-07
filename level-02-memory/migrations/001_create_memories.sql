-- Migration: 001_create_memories
-- Purpose: Create persistent agent memory storage (Level 2, Phase A).
-- WARNING: This migration changes the database schema.
--
-- Design notes:
--   - id: UUID primary key, server-generated via pgcrypto's gen_random_uuid().
--   - user_id: plain TEXT. This project has no auth system, so it identifies
--     "whose memory this is" without implying a real users table exists yet.
--   - category: plain TEXT, not a DB-level CHECK/ENUM. The application (Zod)
--     enforces the allowed set (preference, project_fact, conversation_fact,
--     task_state, technical_knowledge) so adding a new category later is a
--     code change, not a migration.
--   - metadata: JSONB for free-form structured extras without needing a
--     migration every time a new attribute is wanted.
--   - created_at / updated_at: TIMESTAMPTZ (not TIMESTAMP) so values are
--     unambiguous across timezones.
--   - No embedding/vector column yet — that is deferred to a later migration
--     (Phase D) once pgvector is enabled and the real embedding dimension is
--     known. Do not guess it here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  category    TEXT NOT NULL,
  content     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_user_category ON memories (user_id, category);
