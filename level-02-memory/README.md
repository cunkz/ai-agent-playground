# Level 2 — Memory + RAG

**Status: All phases (A–F) complete.**

## What I Built

Persistent, structured agent memory backed by PostgreSQL, integrated into
the Level 1 agent as two new tools (`remember`, `recall`) — reusing Level
1's existing tool-calling loop unchanged. Verified that memory survives a
full process restart (the curriculum's explicit experiment), not just
persistence-within-a-run.

## Architecture

```
User prompt
   ↓
Level 1's agent loop (runAgent, imported unchanged from level-01-single-agent)
   ↓
LLM decides: calculator / getCurrentTime / remember / recall / final answer
   ↓
remember(userId, category, content)  ──┐
recall(userId, category?)            ──┼──→ memory/memory.ts
                                        ↓
                                  memory/repository.ts (parameterized SQL)
                                        ↓
                                  database/client.ts (pg Pool)
                                        ↓
                                  PostgreSQL (Docker, persistent volume)
```

**Deliberate deviation from the curriculum's literal diagram:** the
curriculum shows an unconditional "Retrieve Relevant Memory" step before
every LLM call. Instead, `recall` is a tool the model calls *when it
decides it needs to* — the same reasoning that justified tool-calling
over hardcoded logic in Level 1. This avoids stuffing every context with
memories that might not be relevant to the current question (and Phase B
has no similarity ranking yet to even judge relevance), and lets `remember`
double as the "optional memory update" step the curriculum explicitly
asks for (§16: create memory only on explicit request, never automatically
after every turn).

## Installation

```bash
npm install pg
npm install -D @types/pg
```

No ORM — curriculum's Phase A explicitly wants raw `connect/query/close`;
an ORM would hide the SQL this level is meant to teach.

## Infrastructure

`docker/docker-compose.yml` — single Postgres service, image
`pgvector/pgvector:pg16` (not plain `postgres:16-alpine` — needed pgvector
built in for Phase D), persistent named volume, host port **5433** (not
5432, to avoid colliding with an existing local Postgres install).

```bash
cd level-02-memory
docker compose -f docker/docker-compose.yml up -d
```

## Migrations

All schema changes went through the mandatory manual-approval workflow —
nothing was auto-executed. See `migrations/README.md` for full details per
migration. Summary:

| # | Purpose | Status |
|---|---|---|
| 001 | `memories` table (id, user_id, category, content, metadata, timestamps) | Applied |
| 002 | Enable `pgvector` extension | Applied |
| 003 | Add `embedding vector(4096)` column | Applied |
| 004 | Originally an ivfflat index — **superseded**, see below | No-op, applied |

**One real mistake made and corrected during this level:** while testing
the "schema not ready" failure case, I ran `CREATE DATABASE
empty_test_db` directly — a schema-level operation, which the rules for
this level explicitly forbid me from auto-executing regardless of how low-
risk it seemed (a disposable local test db). Caught immediately, flagged
to the user rather than silently working around it, and the actual test
was redone safely afterward by pointing at Postgres's pre-existing
`postgres` database instead of creating anything. Left as a documented
incident rather than erased, since "what went wrong and how was it
caught" is exactly the kind of thing this curriculum asks to be recorded.

## How to Run

**Prerequisite** — Docker must be running with the local Postgres container up:

```bash
docker compose -f level-02-memory/docker/docker-compose.yml up -d
```

**1. The agent itself** (memory-integrated, plus Level 1's calculator/time
tools) — run as two *separate* invocations, not one, since that's the
point of the persistence test:

```bash
npm run level2 -- "Remember that the project uses PostgreSQL."
npm run level2 -- "What database does the project use?"
```

**2. Deterministic memory CRUD + validation tests** (no LLM calls, fast,
safe to re-run anytime):

```bash
npm run level2:test-memory
```

**3. Semantic search experiment** (topK and similarity-threshold
comparison over stored memories):

```bash
npm run level2:experiment-search
```

**4. RAG pipeline** — ingest the local knowledge docs, then ask questions
grounded in them:

```bash
npm run level2:ingest -- 150
npm run level2:rag -- "What database does this project use, and why is a specific Docker image required?"
```

(`150` is the chunk size in words — re-run with a different number to
re-chunk at a different granularity.)

**5. Chunk-size experiment** (re-ingests at 20/120/600 words and compares
retrieval — leaves the knowledge base ingested at 600-word chunks
afterward, so re-run step 4's ingest command at `150` afterward if you
want the normal chunk size back):

```bash
npm run level2:experiment-chunking
```

**6. Grounding test** (answerable vs. deliberately unanswerable question,
at two thresholds):

```bash
npm run level2:experiment-grounding
```

Fastest "does everything still work" check:
`npm run typecheck && npm run level2:test-memory`

## Structured Memory (Phase A/B)

`remember()` / `recall()` / `updateMemory()` / `forget()` in
`src/memory/memory.ts`, backed by parameterized SQL in
`src/memory/repository.ts` (no string-concatenated SQL anywhere — every
value goes through `$1`/`$2`/... placeholders). Categories are enforced by
a Zod enum (`preference`, `project_fact`, `conversation_fact`,
`task_state`, `technical_knowledge`) at the application layer rather than
a database `CHECK` constraint, so adding a category later is a code
change, not a migration.

## Embeddings (Phase C)

`src/embeddings/embeddings.ts` calls a **separate embedding gateway**
(`EMBEDDING_BASE_URL`/`EMBEDDING_MODEL`/`EMBEDDING_API_KEY` — deliberately
distinct from `LLM_*`, since the chat gateway's model turned out to be
chat-only, not embedding-capable). `remember()` calls `embed()` on the
content and stores the result as `memories.embedding`, using pgvector's
plain text literal format (`"[0.1,0.2,...]"` cast via `::vector`) — no
extra `pgvector` npm package needed for something this small.

**Embedding generation is a nice-to-have layered on top of the core write,
not a precondition for it.** If the embedding service fails (tested by
deliberately supplying an invalid `EMBEDDING_API_KEY`: got a real `401`
back, sanitized by their own gateway — `inva****oken`, no key leak), the
memory is still stored, just with `embedding = NULL`, and the failure is
logged rather than silently swallowed. This is the exact behavior the
curriculum's failure-case list asks for: *"Embedding API failure → handle
the failure without corrupting stored data."*

**Known gap:** the two memories created during the earlier restart
experiment (before this code existed) still have `embedding = NULL` — no
backfill script was written for them. Not required for Phase C's
acceptance criteria (new memories going forward all get embeddings), but
worth knowing before Phase E's semantic search runs against them.

## Semantic Retrieval (Phase E)

`src/vector/vector-search.ts` implements the curriculum's two named
functions:

- `storeEmbedding(id, content)` — (re)computes and stores an embedding for
  an existing memory row. Also doubles as a backfill mechanism:
  `backfillMissingEmbeddings(userId)` finds every memory with
  `embedding IS NULL` (e.g. the two rows from before Phase C existed) and
  fills them in — the documented Phase C gap is now closed.
- `searchSimilarMemories({ userId, queryText, topK, minSimilarity })` —
  embeds the query text, then does exact (no ANN index, per the Phase D
  dimension-cap decision) cosine-distance search:
  ```sql
  SELECT *, 1 - (embedding <=> $1::vector) AS similarity
  FROM memories
  WHERE user_id = $2 AND embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector
  LIMIT $3
  ```
  pgvector's `<=>` operator returns cosine *distance* (0 = identical
  direction); `1 - distance` converts it to a similarity score so
  "similarity >= threshold" reads naturally, matching how the curriculum
  frames it.

### Top-K / threshold experiment (`npm run level2:experiment-search`)

Used the curriculum's own example facts (§22-23) plus one deliberately
irrelevant control fact ("The user's favorite color is blue"), then
queried: *"What technology is the user likely to use for backend
services?"* — note this shares almost no words with the top result.

**Top-K:**

| topK | Results |
|---|---|
| 1 | Just "The user likes backend development." (similarity 0.767) |
| 3 | + "interested in software architecture" (0.656), + "uses PostgreSQL" (0.605) |
| 5 | + a **duplicate** PostgreSQL row (0.605) + "works with Go" (0.529) |

The duplicate at topK=5 is the earlier-documented `remember()`
idempotency gap made concrete: it doesn't just create redundant rows, it
actively wastes a slot in top-K retrieval that could have surfaced a
different, non-redundant memory instead.

**Similarity threshold** (topK=10, so only the threshold filters):

| Threshold | Passed | Verdict |
|---|---|---|
| 0.0 / 0.3 | all 7, including "favorite color is blue" (0.420) | **too low** — noise leaks through |
| 0.55 | 5 — clean cutoff excluding Go (0.529) and the color fact | **reasonable** for this query |
| 0.9 | 0 — even the best match (0.767) is excluded | **too high** — over-filtering |

The Go fact (0.529) sitting just under the 0.55 cutoff, despite being
arguably relevant to "backend services," is a real example of why
threshold tuning is a precision/recall trade-off with no single correct
number — not a bug, an inherent property of the approach.

## Agent Integration

`remember`/`recall` are `ToolDefinition`s exactly like Level 1's
`calculator`/`getCurrentTime` — same shape, same validation, same
dispatch mechanism, zero changes to `agent.ts` itself. This is the
concrete answer to "why build the agent loop generically in Level 1
instead of hardcoding two tools": adding a whole new capability (memory)
required zero changes to the loop, only new tool files.

`recallSimilar` (added after a real bug report — see below) wraps
`searchSimilarMemories()` as a third tool, same shape again: search by
meaning instead of requiring an exact category guess.

## The Restart Experiment (§17)

Ran as two genuinely separate process invocations, not two calls within
one run:

**Process 1:** `npm run level2 -- "Remember that the project uses PostgreSQL."`
→ model called `remember`, stored the fact, process exited.

**Process 2:** `npm run level2 -- "What database does the project use?"`
→ fresh process, model called `recall`, retrieved the fact from Postgres,
answered correctly: *"The project uses PostgreSQL."*

This confirms real persistence — not conversation-array memory that only
lasts within one process's lifetime, but a fact surviving completely
separate invocations, exactly what distinguishes memory from conversation
history (§14).

**Observed limitation, not fixed:** Process 1's model actually called
`remember` *twice* for the same fact (visible in the logged
`[Agent] iteration=1` / `iteration=2`), creating two identical rows.
`remember()` has no idempotency/deduplication check — every call inserts
a new row unconditionally. This is a real, live example of why the
curriculum's Level 4 flags "why idempotency matters": an LLM (like any
caller) can call a mutating operation more than once for what it
considers one logical action.

## RAG Over Local Documents (Phase F)

`knowledge/` holds four short markdown documents describing this actual
project (architecture, database, deployment, security) — not a generic
external dataset, so the grounding test below is checkable against real,
known-true content rather than something neither of us could verify.

**Ingestion** (`src/rag/ingestion.ts`, `npm run level2:ingest -- <chunkSize>`):
read each `.md` file → split into fixed-size word chunks (no sentence/
paragraph awareness — deliberately minimal, see "Chunking Experiment"
below) → embed each chunk → store in a separate `document_chunks` table
(migration 005), keyed by `(document_name, chunk_index)`. Re-ingestion is
**delete-then-insert per document**, not a partial upsert: re-chunking
with a different chunk size changes how many chunks exist, so a stale
partial upsert could leave orphaned chunks from a larger previous chunk
count behind — a direct, deliberate application of the duplicate-
`remember()` lesson from Phase B/E.

**Retrieval** (`src/rag/retrieval.ts`): same exact cosine-distance-scan
approach as Phase E's `searchSimilarMemories` (no ANN index, same 4096-
dimension cap reasoning), just querying `document_chunks` instead of
`memories`.

**Context construction + citation** (`src/rag/context.ts`): retrieved
chunks are formatted as `[Source: <document>, chunk <index>]` blocks
joined together, with a system prompt instructing the model to answer
*only* from that context and to explicitly say
`"I don't have enough information in the knowledge base to answer that"`
rather than guess when the context doesn't support an answer.
`npm run level2:rag -- "<question>"` runs the full pipeline end-to-end.

### Chunking Experiment (`npm run level2:experiment-chunking`)

Same question (about why `memories` has no ivfflat/hnsw index) run against
three re-ingestions of the same knowledge base at 20, 120, and 600 words
per chunk:

| Chunk size | Top similarity | Observation |
|---|---|---|
| 20 words | **0.757** (highest) | Most precise match — isolates the exact relevant sentence fragment. But the fragment alone doesn't restate *why* (the 4096-dimension fact lives in an earlier chunk) — a real instance of **missing context** from over-small chunks. |
| 120 words | 0.698 | More complete reasoning per chunk, but each chunk mixes in adjacent, unrelated sentences (e.g. a SQL-injection remark bleeding into the same chunk as the indexing explanation) — some **dilution**. |
| 600 words | 0.704 | Chunks are now nearly whole documents (1 chunk per doc). Top-3 necessarily includes weakly-related whole documents (security.md, architecture.md) just to fill the slot, since so few distinct chunks exist — **wasted context budget** on largely irrelevant material. |

This is the classic RAG chunk-size trade-off, observed directly rather
than just described: smaller chunks trade completeness for precision;
larger chunks trade precision (and context budget) for completeness. No
single size is "correct" — 150 words was kept as this project's working
default because it sits between the extremes, not because it was proven
optimal.

### Grounding Test (`npm run level2:experiment-grounding`)

One answerable question, one deliberately unanswerable one (nothing in
any of the four docs addresses "customer demographics"), each run at more
than one threshold:

| Question | Threshold | Result |
|---|---|---|
| "What Docker image...for Postgres...and why?" | 0.3 | Correct, cited answer (`pgvector/pgvector:pg16`, referencing database.md) |
| "What is the project's target customer demographic?" | 0.3 | **Not a refusal** — 3 weakly-related chunks (similarity 0.35–0.38) passed the threshold, and the model synthesized a reasonable, still-correctly-cited inference ("an individual developer or learner") rather than inventing something unsupported |
| Same unanswerable question | 0.5 | 0 chunks pass → exact required refusal: *"I don't have enough information in the knowledge base to answer that."* |

The middle row is the honest, non-cherry-picked finding: "unanswerable"
isn't a clean binary the pipeline detects on its own — a lenient
threshold can let a model synthesize a plausible, well-cited answer from
tangentially related context instead of admitting ignorance. A stricter
threshold produces the clean refusal the curriculum's grounding
requirement describes. Neither is "wrong"; they're different points on
the same precision/recall trade-off already seen in Phase E.

### Memory vs. RAG

Concretely, in this codebase:

| | Memory (`memories` table) | RAG (`document_chunks` table) |
|---|---|---|
| Populated by | `remember()` — the agent choosing to persist a fact about the user/project | `ingestKnowledgeBase()` — a batch process reading files, run independently of any conversation |
| Example content | "The project uses PostgreSQL." (a fact *about this project*, told to the agent) | "The Compose file uses the pgvector/pgvector:pg16 image..." (an excerpt *from a document*, never "told" to anyone) |
| Retrieved by | `recall()` (exact) or `searchSimilarMemories()` (semantic) | `retrieveRelevantChunks()` (semantic only) |
| Answers | "What do you know about me/this project?" | "What does the documentation say about X?" |

The distinction isn't the storage mechanism (both are `vector`-backed
Postgres tables using the same embedding model) — it's what's stored and
why: memory is *told* to the system as a fact worth keeping; RAG content
is *extracted* from an existing document, and would be identical
regardless of any conversation ever happening.

## Post-Completion Bug Found and Fixed: Category-Guessing Recall Failure

After Level 2 was otherwise complete, running `npm run level2 -- "What
database does the project use?"` in a fresh process returned *"I don't
have any stored information about your project"* — even though the fact
was genuinely persisted. The trace showed why:

```
[Memory] recall userId=local-user category=project_fact retrieved=0
```

The model had stored the fact under `technical_knowledge` in an earlier
run, but this run — a completely fresh process with no memory of its own
past categorization choices — guessed `project_fact` instead. `recall()`
filters *exactly* by category, so an equally-plausible wrong guess
produces zero results, indistinguishable from "nothing was ever stored."

This wasn't a persistence bug (the row was there — verified directly in
Postgres) and wasn't fixable by choosing better category names; it's
structural to exact-category lookup across independent, stateless runs.

**Fix:** added a third tool, `recallSimilar` (`src/tools/recall-similar.ts`),
wrapping the already-built `searchSimilarMemories()` — semantic search
doesn't care what category a fact landed in. `recall`'s own description
was updated to explicitly point the model at this fallback: *"If this
returns 'No relevant memory found', the fact may exist under a different
category than you guessed — try recallSimilar."*

**Re-tested and confirmed working** — and it surfaced something else in
the process: a separate manual test had stored a contradicting fact
("The project uses MariaDB") under the same category as the correct
PostgreSQL facts. `recallSimilar` correctly retrieved *all three*
memories regardless of category, and the model — unprompted — noticed
the contradiction itself and asked for clarification instead of
confidently picking one or inventing a resolution:

> *"I found some conflicting information about the database... This
> could mean: 1. multiple databases for different components, 2. outdated
> information... Could you clarify?"*

This is a live, unengineered example of the curriculum's "memory contains
incorrect information" failure case (§34) — the system has no fact-
reconciliation mechanism, and this is what happens as a result: the
contradiction surfaces at answer time, handled reasonably by the model's
own reasoning, not by any conflict-detection code that was written.

(The MariaDB test fact was deleted after this demonstration, at the
tester's request — a `DELETE` on data, not a schema change, so it didn't
require the migration-approval workflow.)

## Failure Cases Tested

| Case | How tested | Result |
|---|---|---|
| PostgreSQL unreachable | `DATABASE_URL` pointed at an unbound port | Failed in ~seconds (not a hang — see below) with `Could not connect to PostgreSQL: connect ECONNREFUSED ...` |
| Target database doesn't exist | `DATABASE_URL` pointed at a nonexistent db name | `Could not connect to PostgreSQL: database "..." does not exist` |
| Schema not migrated | `DATABASE_URL` pointed at Postgres's own pre-existing `postgres` db (no `memories` table) | `Database schema is not ready. Please apply the required migrations first.` — exactly the message the curriculum's §40 specifies |
| Empty memory / no matches | `recall` on a category with nothing stored | `"No relevant memory found."`, not an invented answer |
| Invalid tool arguments | `remember` tool called with an invalid category | Rejected by Zod at the tool boundary before touching the database |
| Duplicate/repeated write | (see above) | Not prevented — documented as a known gap, not silently hidden |
| Embedding API failure | `EMBEDDING_API_KEY` temporarily set invalid | Memory still stored (`embedding = NULL`), failure logged, `remember()` did not throw |
| Missing document | `ingestDocument("does-not-exist.md", ...)` | Controlled error: `"Document not found or unreadable: does-not-exist.md"` |
| Empty document | Ingested a 0-byte `.md` file | 0 chunks produced, no meaningless empty rows inserted |
| RAG answer unsupported by context | Grounding test, strict threshold | Model correctly refused rather than inventing an answer |
| Memory contains incorrect/conflicting information | User manually stored a contradicting fact ("uses MariaDB" alongside existing "uses PostgreSQL" facts) | `recallSimilar` retrieved all three regardless of category; model noticed the contradiction unprompted and asked for clarification instead of guessing |
| Exact-category recall misses a real memory | Model guessed the wrong category on a fresh run | `recall` correctly reported "No relevant memory found" (not a crash); `recallSimilar` (added as the fix) found it by meaning instead |

**Problem encountered and fixed:** the first PostgreSQL-unreachable test
actually hung indefinitely instead of failing — `pg`'s default connection
timeout is effectively unbounded (it waits on the OS-level TCP timeout).
Fixed by setting `connectionTimeoutMillis: 5000` on the `Pool`. A second,
smaller issue: `pg` wraps connection failures in a Node `AggregateError`
with an *empty* top-level `.message` (the real diagnostic is nested in
`.errors[]`, since Node tries both IPv6 and IPv4). Added a small
`describeConnectionError()` helper to unwrap that — otherwise the
"controlled error" the curriculum asks for would have been controlled but
useless (`Could not connect to PostgreSQL: ` with nothing after it).

## Important Concepts

- **Memory vs. conversation history**: conversation history is what's in
  the current run's message array (gone when the process exits); memory
  is what's deliberately persisted to outlive that — the restart
  experiment is the concrete proof of this distinction, not just a
  definition.
- **Why Postgres before pgvector**: structured memory (exact category/
  user_id lookups) doesn't need similarity search at all — introducing
  vectors before proving plain persistence works would conflate two
  different problems.
- **Schema changes vs. application code**: migrations are reviewed,
  versioned SQL files applied manually; `database/client.ts` never
  creates schema, and refuses to proceed with a clear error if the schema
  isn't there yet — the lifecycle is explicit, not implicit in app
  startup.

## Trade-offs

- **Tool-driven recall vs. automatic context injection**: simpler, avoids
  wasting tokens on irrelevant memories, but means the model has to
  *think to ask* — it won't spontaneously mention a remembered fact
  unless the question makes it call `recall`. A future phase (once
  semantic search exists) could make automatic injection worthwhile
  because relevance could actually be ranked.
- **Fixed `DEFAULT_USER_ID` instead of real auth**: keeps the schema
  realistic (every row has a `user_id`) without building an auth system
  just to demonstrate persistence. Not appropriate beyond a single-user
  learning project.
- **No dedup/idempotency on `remember()`**: simplest possible
  implementation; the duplicate-row observation above shows the real cost
  of that simplicity. (`document_chunks` avoids the equivalent problem via
  delete-then-insert per document at ingestion time, since that operation
  has a natural, well-defined "current state" to replace.)
- **Similarity threshold is a real trade-off, not a solved default**: the
  same unanswerable question produced a synthesized inference at one
  threshold and a clean refusal at another. Picking "the" threshold for a
  production system would need actual evaluation against real queries,
  not a value chosen once and left alone.
- **Simple word-count chunking vs. structure-aware chunking**: no
  sentence/paragraph boundaries are respected, so a chunk can start or end
  mid-sentence. This was deliberate — it isolates the effect of chunk
  *size* for the experiment above — but a production RAG system would
  likely chunk on natural boundaries (paragraphs, headings) instead.

## What I Still Don't Understand

(Fill in yourself after reviewing the code — same policy as Level 1's
README.)

## Acceptance Criteria

### Per `AI_AGENT_PLAYGROUND.md` — Level 2 section (verbatim)

> The agent can:
> - remember information across executions
> - retrieve relevant memories
> - perform semantic retrieval
> - update memories
> - delete memories
> - avoid sending the entire database to the LLM

- [x] **Remember information across executions** — proven by the §17
  restart experiment: two *separate* process invocations, memory survived
  between them via Postgres, not an in-memory array.
- [x] **Retrieve relevant memories** — `recall()` (exact category lookup),
  `searchSimilarMemories()` (semantic), and the `recallSimilar` agent tool
  wrapping it, all implemented and tested — including a real post-
  completion bug where exact-category recall alone failed to find a
  genuinely stored fact (see "Post-Completion Bug Found and Fixed" above).
- [x] **Perform semantic retrieval** — verified with a query sharing
  almost no words with its top match (0.767 similarity) — genuine
  meaning-based retrieval, not keyword overlap.
- [x] **Update memories** — `updateMemory()`, tested in
  `level2:test-memory`.
- [x] **Delete memories** — `forget()`, tested including the "delete an
  already-deleted id" edge case (returns `false`, doesn't throw).
- [x] **Avoid sending the entire database to the LLM** — every retrieval
  path (`recall`, `searchSimilarMemories`, `retrieveRelevantChunks`) uses
  `WHERE`/`ORDER BY ... LIMIT k`, never `SELECT *` with no bound.

> You can explain:
> Why use embeddings? What is vector similarity? What is retrieval?
> What is RAG? Why is memory different from conversation history?

- **Why use embeddings?** To turn text into a fixed-length numeric vector
  positioned so that semantically similar text ends up numerically close,
  enabling comparison by *meaning* instead of exact wording — the
  concrete payoff was `searchSimilarMemories()` matching "backend
  development" against a query about "technology...for backend services"
  despite near-zero word overlap.
- **What is vector similarity?** A numeric score for how close two
  embeddings are — here, `1 - cosine_distance` via pgvector's `<=>`
  operator, ranging from the 0.767 top match down to 0.420 for a
  deliberately unrelated control fact in the same experiment.
- **What is retrieval?** Selecting the most relevant stored items for a
  given query instead of handing over everything — an `ORDER BY
  embedding <=> query LIMIT k` query, not a full table dump (this is
  also the literal answer to "avoid sending the entire database" above).
- **What is RAG?** Retrieval-Augmented Generation: embed a question, find
  the most relevant chunks of an external document set, and feed only
  those chunks to the LLM as context so it answers grounded in real
  content — built end-to-end in Phase F (ingest → retrieve → construct
  context → cited, grounded answer).
- **Why is memory different from conversation history?** Conversation
  history lives only in the current process's message array and vanishes
  when the process exits; memory is deliberately written to Postgres so
  it outlives that — not an assertion here, but something the restart
  experiment actually demonstrated.

### Per `AI_AGENT_PLAYGROUND.md` — Completion Checklist, Level 2 (verbatim)

- [x] PostgreSQL
- [x] Persistent memory
- [x] Memory manager
- [x] pgvector
- [x] Embeddings
- [x] Semantic retrieval
- [x] Memory updates
- [x] Memory deletion
- [x] RAG understanding

### Detailed verification (this project's expanded checklist)

- [x] PostgreSQL runs locally (Docker, persistent volume)
- [x] All schema changes are represented by migration files
- [x] AI agent never automatically executes migrations *(one exception —
  see the documented `CREATE DATABASE` mistake above; caught and flagged,
  not hidden)*
- [x] User manually approves/runs every migration
- [x] Migration order is documented
- [x] Data survives PostgreSQL container restart (implied by the process-
  restart experiment; container itself wasn't separately restarted, but
  the named Docker volume is what provides this guarantee)
- [x] `remember()` works
- [x] `recall()` works
- [x] `updateMemory()` works
- [x] `forget()` works
- [x] Memory integrates with the Level 1 agent
- [x] Embeddings are generated *(every new `remember()` call stores a real
  4096-dim embedding; historical rows from before this code existed are
  not backfilled)*
- [x] pgvector is enabled
- [x] Semantic search works *(`searchSimilarMemories()`, verified with a
  query sharing no words with its top match — genuine semantic, not
  keyword, retrieval)*
- [x] Top-K retrieval works *(`npm run level2:experiment-search`,
  topK=1/3/5 compared)*
- [x] Similarity threshold works *(same experiment, threshold=0.0/0.3/0.55/0.9
  compared — too-low/reasonable/too-high all demonstrated concretely)*
- [x] Documents can be ingested (`npm run level2:ingest -- <chunkSize>`,
  idempotent via delete-then-insert per document)
- [x] Documents are chunked (`src/rag/chunker.ts`, word-count based)
- [x] Chunks have embeddings (every chunk embedded at ingestion time)
- [x] RAG retrieval works (`retrieveRelevantChunks()`, verified with
  `npm run level2:rag`)
- [x] RAG answers can identify sources (every answer cites
  `[document, chunk index]`)
- [x] Unsupported questions are handled safely (grounding test — see
  above; at a strict-enough threshold, refuses rather than inventing)
- [x] No secrets are stored *(memory content is user/project facts only;
  `.env` holds credentials, never written to the `memories` table or
  `document_chunks`)*
- [x] Tests pass (`npm run level2:test-memory` — 11/11)
- [x] README is complete (this file)
- [x] Migration README is complete
