# Migrations — Level 2 (Memory + RAG)

Schema changes are never executed automatically by the AI coding agent.
Every migration here must be reviewed and manually applied by you.

## Migration Order

```
001_create_memories.sql          ← applied 2026-09-07
        ↓
002_enable_pgvector.sql          ← applied 2026-09-07
        ↓
003_add_memory_embeddings.sql    ← applied 2026-09-07
        ↓
004_create_vector_index.sql      ← no-op (see below), applied 2026-09-07
        ↓
005_create_document_chunks.sql   ← ready to apply
```

003 was blocked until a real embedding model was confirmed on a separate
gateway (`EMBEDDING_BASE_URL` / `EMBEDDING_MODEL`, distinct from the
chat-completion `LLM_*` vars — the original `LLM_BASE_URL` gateway's
`mimo` model turned out to be chat-only, see the earlier troubleshooting
in this project's conversation history). Once `EMBEDDING_MODEL=Qwen3-Embedding-8B`
was probed directly and returned a real `data[0].embedding.length` of
**4096**, that confirmed number replaced the `<VECTOR_DIMENSION>`
placeholder in 003 — never guessed.

## 001_create_memories

**Purpose:** Create the base `memories` table for structured, non-semantic
persistent memory (Phase A/B — `remember()` / `recall()` / `updateMemory()`
/ `forget()`).

**Changes:**
- `CREATE EXTENSION IF NOT EXISTS pgcrypto` — provides `gen_random_uuid()`.
- `CREATE TABLE memories (...)` — see the file's own comments for column
  rationale.
- `CREATE INDEX idx_memories_user_category` — supports the expected access
  pattern (`recall()` filtering by `user_id` + `category`).

**Dependencies:** none — this is the first migration.

**Manual command:**

```bash
cd level-02-memory
docker compose -f docker/docker-compose.yml up -d
psql "$DATABASE_URL" -f migrations/001_create_memories.sql
```

(`$DATABASE_URL` is read from the repo root `.env` —
`postgresql://agent:agent@localhost:5433/agent_memory` by default — host
port 5433 was chosen instead of the standard 5432 to avoid clashing with
an existing local Postgres install.)

**Verification** (read-only, safe to run any time):

```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'memories';
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'memories';
```

**Recovery if it fails:** the migration is a single transaction-safe DDL
script with no data to lose (fresh table). If `psql` reports an error,
nothing partial should remain — re-run after fixing the reported issue. If
you need to start over entirely: `DROP TABLE IF EXISTS memories;` (manual,
same safety rule applies) then re-run the migration.

## 002_enable_pgvector

**Purpose:** Enable the `vector` extension/type so a later migration can
add a vector column.

**Changes:** `CREATE EXTENSION IF NOT EXISTS vector`.

**Dependencies:** 001 must already be applied (not technically required by
this migration's SQL, but it's the established order).

**Manual command:**

```bash
psql "$DATABASE_URL" -f migrations/002_enable_pgvector.sql
```

**Verification:**

```sql
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

**Recovery if it fails:** `docker/docker-compose.yml` uses the
`pgvector/pgvector:pg16` image specifically so this extension is available
out of the box — if `CREATE EXTENSION vector` still fails, confirm the
container is actually running that image (`docker compose images`) rather
than a stale plain-Postgres container from an earlier run. No data risk
either way; this migration only adds a capability, nothing to roll back.

## 003_add_memory_embeddings

**Purpose:** Add an `embedding vector(4096)` column to `memories`.

**Dimension:** 4096, confirmed 2026-09-07 by calling the real embedding
endpoint (`EMBEDDING_MODEL=Qwen3-Embedding-8B`) and reading
`response.data[0].embedding.length` — not guessed.

**Dependencies:** 002 must already be applied.

**Manual command:**

```bash
psql "$DATABASE_URL" -f migrations/003_add_memory_embeddings.sql
```

**Verification:**

```sql
SELECT column_name, udt_name FROM information_schema.columns
WHERE table_name = 'memories' AND column_name = 'embedding';
```

## 004_create_vector_index — NO-OP BY DESIGN

**Originally intended:** an `ivfflat` index on `memories.embedding` for
approximate nearest-neighbor search.

**What actually happened:** applying it failed —
`ERROR: column cannot have more than 2000 dimensions for ivfflat index`.
pgvector's ANN index types cap out at 2000 dimensions (`vector` type) or
4000 (`halfvec`, half-precision). This project's embedding model outputs
**4096** dimensions — over both caps.

**Decision:** no ANN index. Semantic search (Phase E) uses exact
sequential-scan cosine distance instead: `ORDER BY embedding <=>
query_embedding LIMIT k`. This is always exact and its full-scan cost is
negligible at the scale a personal/learning memory store will reach. See
the file's own comment block for the full reasoning and the condition
under which this decision should be revisited (row count growing into the
tens/hundreds of thousands).

**Manual command:** harmless to run (`SELECT 1;`), kept only so the
migration sequence records this decision rather than silently having a
gap at 004.

```bash
psql "$DATABASE_URL" -f migrations/004_create_vector_index.sql
```

## 005_create_document_chunks

**Purpose:** Create `document_chunks`, a separate table from `memories`,
to store chunked local documents for RAG retrieval (Phase F).

**Changes:**
- `CREATE TABLE document_chunks (...)` — see the file's own comments for
  column rationale.
- `CREATE UNIQUE INDEX idx_document_chunks_doc_chunk` on
  `(document_name, chunk_index)` — enables idempotent re-ingestion via
  `INSERT ... ON CONFLICT ... DO UPDATE`, directly applying the lesson
  learned from the duplicate-`remember()` issue in Phase B/E.

**Dimension:** `vector(4096)`, reusing the same confirmed dimension from
migration 003 — same embedding model/gateway, not re-guessed.

**No ANN index**, same reasoning as migration 004 (4096 exceeds pgvector's
2000/4000 index caps) — retrieval will use exact cosine-distance scan.

**Dependencies:** 002 (`pgvector` extension) must already be applied.

**Manual command:**

```bash
psql "$DATABASE_URL" -f migrations/005_create_document_chunks.sql
```

**Verification:**

```sql
SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'document_chunks';
SELECT indexname FROM pg_indexes WHERE tablename = 'document_chunks';
```

**Recovery if it fails:** fresh table, no data to lose — fix the reported
issue and re-run. To start over: `DROP TABLE IF EXISTS document_chunks;`
(manual, same safety rule applies) then re-run.
