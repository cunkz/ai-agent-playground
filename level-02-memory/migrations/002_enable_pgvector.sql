-- Migration: 002_enable_pgvector
-- Purpose: Enable the pgvector extension for semantic/vector similarity
--          search (Level 2, Phase D).
-- WARNING: This migration changes the database schema (adds an extension).
--
-- Dependencies: 001_create_memories.sql must already be applied.
--
-- This migration does not depend on the embedding model's dimension at all —
-- it only makes the `vector` type available so 003 can use it.

CREATE EXTENSION IF NOT EXISTS vector;
