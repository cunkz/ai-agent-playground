import { remember } from "../../memory/memory.js";
import { query } from "../../database/client.js";
import type { MemoryCategory } from "../../memory/types.js";

// Isolated from the real DEFAULT_USER_ID memories, so this experiment's
// synthetic seed data never contaminates (or is contaminated by) the
// actual demo memories already stored from earlier levels.
export const EXPERIMENT_USER_ID = "token-usage-experiment";

export const TASK_PROMPT =
  "Add a new API endpoint that retrieves user preferences. Follow the existing architecture, " +
  "authentication approach, database conventions, error-handling conventions, and project coding style.";

interface SeedFact {
  category: MemoryCategory;
  content: string;
  relevant: boolean;
}

// Relevant to the task — project facts, ADRs, conventions, constraints.
// Content taken directly from the experiment brief's own examples.
const RELEVANT_FACTS: SeedFact[] = [
  { category: "project_fact", content: "Backend: Node.js + TypeScript", relevant: true },
  { category: "project_fact", content: "Database: PostgreSQL", relevant: true },
  { category: "project_fact", content: "API style: REST", relevant: true },
  { category: "project_fact", content: "Validation: Zod", relevant: true },
  { category: "project_fact", content: "Authentication: JWT", relevant: true },
  {
    category: "technical_knowledge",
    content: "ADR-001: Use PostgreSQL as the primary persistent database.",
    relevant: true,
  },
  {
    category: "technical_knowledge",
    content: "ADR-002: Business logic must not be placed directly inside HTTP handlers.",
    relevant: true,
  },
  { category: "technical_knowledge", content: "ADR-003: Use Zod for request validation.", relevant: true },
  {
    category: "technical_knowledge",
    content: "ADR-004: Do not introduce Redis unless distributed caching or job processing becomes necessary.",
    relevant: true,
  },
  { category: "technical_knowledge", content: "Coding convention: use async/await.", relevant: true },
  {
    category: "technical_knowledge",
    content: "Coding convention: return typed results from service functions.",
    relevant: true,
  },
  {
    category: "technical_knowledge",
    content: "Coding convention: keep database access inside repository modules.",
    relevant: true,
  },
  { category: "technical_knowledge", content: "Coding convention: use structured error handling.", relevant: true },
  {
    category: "technical_knowledge",
    content: "Coding convention: do not expose internal database errors to API clients.",
    relevant: true,
  },
  { category: "task_state", content: "Known constraint: the API must remain stateless.", relevant: true },
  {
    category: "task_state",
    content: "Known constraint: the application must work with PostgreSQL running in Docker.",
    relevant: true,
  },
  { category: "task_state", content: "Known constraint: secrets must never be stored in source code.", relevant: true },
  {
    category: "conversation_fact",
    content:
      "Previous task: implemented a user authentication endpoint using JWT, following the repository pattern from ADR-002.",
    relevant: true,
  },
];

// Deliberately irrelevant to the task — old, unrelated discussions.
const IRRELEVANT_FACTS: SeedFact[] = [
  {
    category: "conversation_fact",
    content:
      "Previous discussion about Redis: evaluated Redis for session caching but decided against it per ADR-004; revisit if traffic grows significantly.",
    relevant: false,
  },
  {
    category: "conversation_fact",
    content:
      "Previous discussion about Kafka: considered Kafka for event streaming between services; deferred, no microservices exist yet.",
    relevant: false,
  },
  {
    category: "conversation_fact",
    content:
      "Old deployment experiment: tried deploying via a Heroku-style buildpack before settling on Docker Compose for local development.",
    relevant: false,
  },
  {
    category: "conversation_fact",
    content:
      "Old UI decision: the admin dashboard was initially built with server-rendered EJS templates before switching to a React SPA.",
    relevant: false,
  },
  {
    category: "conversation_fact",
    content:
      "Unrelated RAG experiment: tested chunking a large PDF manual for a customer-support chatbot prototype unrelated to this API.",
    relevant: false,
  },
  {
    category: "conversation_fact",
    content:
      "Old debugging session: spent two days tracking down a connection pool exhaustion bug in an unrelated reporting service.",
    relevant: false,
  },
  {
    category: "conversation_fact",
    content: "Unrelated API endpoint: documented the /api/invoices endpoint, which has no relation to user preferences.",
    relevant: false,
  },
];

export const ALL_SEED_FACTS = [...RELEVANT_FACTS, ...IRRELEVANT_FACTS];

export async function seedProjectContext(): Promise<void> {
  // Delete-then-insert, same idempotency pattern as document ingestion —
  // re-running the experiment shouldn't duplicate seed memories.
  await query(`DELETE FROM memories WHERE user_id = $1`, [EXPERIMENT_USER_ID]);

  for (const fact of ALL_SEED_FACTS) {
    await remember({
      userId: EXPERIMENT_USER_ID,
      category: fact.category,
      content: fact.content,
      metadata: { relevant: fact.relevant },
    });
  }

  console.log(
    `[Experiment] seeded ${ALL_SEED_FACTS.length} memories (${RELEVANT_FACTS.length} relevant, ${IRRELEVANT_FACTS.length} irrelevant)`,
  );
}
