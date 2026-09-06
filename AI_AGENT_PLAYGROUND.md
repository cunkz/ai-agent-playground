# AI Agent Playground

A hands-on curriculum for learning modern AI Agent Engineering from first principles to a multi-agent autonomous system.

Primary language:

**Node.js + TypeScript**

Secondary language:

**Go**, introduced later for backend services that AI agents interact with.

The goal is not merely to learn how to call an LLM.

The goal is to understand the architecture behind:

- LLM applications
- Tool-using agents
- Agent loops
- Memory
- RAG
- Multi-agent systems
- Scheduling
- Autonomous agents
- MCP
- Agent orchestration
- Agent harnesses
- Observability
- Security
- Production-style AI systems

---

# 1. Core Learning Philosophy

This project must be developed incrementally.

Do NOT install the entire AI stack at the beginning.

Do NOT implement all levels at once.

Do NOT introduce frameworks before understanding the underlying concept.

Do NOT hide important concepts behind abstractions too early.

The learning progression is:

```text
Level 0
LLM Fundamentals
        ↓
Level 1
Tool-Using Agent
        ↓
Level 2
Memory + RAG
        ↓
Level 3
Multi-Agent System
        ↓
Level 4
Scheduler + Autonomous Tasks
        ↓
Level 5
MCP
        ↓
Level 6
Agent Orchestration Framework
        ↓
Level 7
Agent Harness
        ↓
Level 8
AI Engineering Team
```

Each level must be completed before moving to the next level.

---

# 2. Technology Strategy

## Primary Language

Use:

```text
Node.js
TypeScript
npm
```

Do not use Python unless there is a compelling technical reason.

The purpose of this project is to learn AI engineering while leveraging existing backend experience.

---

# 3. Technology Stack by Level

Install only what is required for the current level.

| Level | Technology | Purpose |
|---|---|---|
| 0 | Node.js + TypeScript | LLM fundamentals |
| 0 | LLM SDK | Model communication |
| 0 | dotenv | Environment variables |
| 1 | Zod | Tool/input validation |
| 2 | PostgreSQL | Persistent memory |
| 2 | pgvector | Semantic/vector memory |
| 2 | Embedding model | Memory retrieval |
| 3 | Existing stack | Multi-agent orchestration |
| 4 | Redis | Queue/state |
| 4 | BullMQ | Jobs/scheduling |
| 5 | MCP SDK | Tool protocol |
| 6 | LangGraph.js | Agent orchestration |
| 7 | Multica / OpenHands / similar | Agent harness experimentation |
| 8 | Combined stack | Final project |
| 8 | Go | Backend service integration |
| Optional | Langfuse | Observability |

---

# 4. What NOT to Install Initially

At the beginning, DO NOT install:

```text
LangGraph
CrewAI
AutoGen
Temporal
BullMQ
Redis
pgvector
MCP
Mem0
Letta
Multica
OpenHands
```

These technologies will be introduced when their concepts become relevant.

The point is to understand what each technology solves before using it.

---

# 5. Machine Prerequisites

Before Level 0, verify that the following are available:

```text
VS Code
Node.js LTS
npm
Git
Docker
```

Docker is not required to run Level 0.

It will become useful starting with Level 2.

Verify:

```bash
node --version
npm --version
git --version
docker --version
```

Recommended:

```text
Node.js: current LTS
TypeScript: current stable
npm: version bundled with Node.js
```

---

# 6. Project Structure

Create:

```text
ai-agent-playground/
│
├── README.md
├── AI_AGENT_PLAYGROUND.md
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
│
├── level-00-foundation/
│   ├── src/
│   └── README.md
│
├── level-01-single-agent/
│   ├── src/
│   │   ├── index.ts
│   │   ├── agent.ts
│   │   └── tools/
│   │       ├── calculator.ts
│   │       └── time.ts
│   └── README.md
│
├── level-02-memory/
│   ├── src/
│   ├── migrations/
│   └── README.md
│
├── level-03-multi-agent/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── manager.ts
│   │   │   ├── researcher.ts
│   │   │   ├── writer.ts
│   │   │   └── reviewer.ts
│   │   └── workflows/
│   └── README.md
│
├── level-04-scheduler/
│   ├── src/
│   │   ├── jobs/
│   │   ├── workers/
│   │   └── scheduler/
│   └── README.md
│
├── level-05-mcp/
│   ├── client/
│   ├── server/
│   └── README.md
│
├── level-06-agent-framework/
│   ├── src/
│   └── README.md
│
├── level-07-harness/
│   ├── experiments/
│   └── README.md
│
└── level-08-final-project/
    ├── src/
    ├── agents/
    ├── tools/
    ├── memory/
    ├── workflows/
    └── README.md
```

---

# 7. Environment Variables

Create:

```text
.env.example
```

Example:

```env
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=

DATABASE_URL=
REDIS_URL=
```

Never commit `.env`.

`.gitignore` must contain:

```text
.env
node_modules/
dist/
coverage/
```

The exact provider-specific variables may be added when Level 0 is implemented.

---

# Level 0 — LLM Fundamentals

## Objective

Understand how an LLM application communicates with a model.

Architecture:

```text
User
 ↓
Node.js
 ↓
LLM API
 ↓
Response
```

This is NOT an agent yet.

---

## Installation

Initialize the project:

```bash
npm init -y
```

Install:

```bash
npm install dotenv
npm install -D typescript tsx @types/node
```

Install the SDK for the selected LLM provider.

Do not install an agent framework.

---

## Build

Create a simple program:

```text
level-00-foundation/
└── src/
    └── index.ts
```

It should:

1. Load environment variables.
2. Send a prompt to an LLM.
3. Receive the response.
4. Print the response.

---

## Experiments

Test:

```text
Explain Redis Streams.

Explain Redis Streams in exactly 3 bullet points.

Return JSON containing:
- topic
- summary
- difficulty
```

Experiment with:

- system instructions
- user messages
- structured output
- streaming
- errors
- invalid API keys
- timeouts

---

## Learn

Understand:

```text
LLM
Model
Prompt
Message
System message
User message
Assistant message
Token
Context window
Temperature
Streaming
Structured output
API error
Rate limit
Retry
```

---

## Acceptance Criteria

You can explain:

```text
What is an LLM API call?

What is context?

What is a token?

What is streaming?

Why should API keys never be hardcoded?

What happens when an API request fails?

What is the difference between system and user instructions?
```

Do not continue until these concepts are understood.

---

# Level 1 — Single Tool-Using Agent

## Objective

Understand the fundamental agent loop.

Architecture:

```text
User
 ↓
Agent
 ↓
LLM
 ↓
Tool decision
 ↓
Tool
 ↓
Tool result
 ↓
LLM
 ↓
Final answer
```

---

# Installation

Install:

```bash
npm install zod
```

Do not install LangGraph or another agent framework.

---

# Build

Create:

```text
level-01-single-agent/
├── src/
│   ├── index.ts
│   ├── agent.ts
│   └── tools/
│       ├── calculator.ts
│       └── time.ts
└── README.md
```

Tools:

```text
calculator()
getCurrentTime()
```

---

# Example

User:

```text
Calculate 123 * 456.
```

Agent:

```text
LLM decides calculator is required.
```

Tool:

```text
calculator(123, 456)
```

Result:

```text
56088
```

Agent:

```text
123 × 456 = 56,088
```

---

# Important Concept

Understand the difference:

```text
LLM
```

versus:

```text
Agent
```

An LLM primarily generates responses.

An agent can:

```text
Observe
 ↓
Decide
 ↓
Act
 ↓
Observe result
 ↓
Continue
 ↓
Finish
```

---

# Experiments

Test:

```text
What is 123 * 456?

What time is it?

What is 123 * 456 and what time is it?

What is Go?

Calculate something impossible.

Ask the agent to call a nonexistent tool.

Give the calculator invalid arguments.
```

---

# Implement Protection

Handle:

```text
invalid tool arguments
tool errors
unknown tools
model errors
timeouts
maximum iterations
```

Prevent infinite loops.

Example:

```text
MAX_AGENT_ITERATIONS = 10
```

---

# Acceptance Criteria

The agent must:

- understand available tools
- select the correct tool
- provide arguments
- execute the tool
- receive the result
- continue processing
- produce a final answer
- stop safely

You should be able to draw the agent loop from memory.

---

# Level 2 — Memory + RAG

## Objective

Understand persistent memory.

Architecture:

```text
Agent
 ↓
Memory Manager
 ↓
PostgreSQL
```

---

# Infrastructure

Use Docker for PostgreSQL.

Create:

```text
docker-compose.yml
```

Initially run:

```text
PostgreSQL
```

Later enable:

```text
pgvector
```

---

# Installation

Install a PostgreSQL client library suitable for Node.js.

Also install an embedding SDK/API mechanism when semantic memory is introduced.

Do not install Mem0 or Letta initially.

Build the memory system yourself first.

---

# Level 2A — Basic Persistent Memory

Create:

```text
memories
---------
id
type
content
importance
metadata
created_at
updated_at
```

Implement:

```text
remember()
recall()
forget()
updateMemory()
```

---

# Experiment

Tell the agent:

```text
My preferred programming language is Go.
```

Store it.

Terminate the program.

Start it again.

Ask:

```text
What programming language do I prefer?
```

The answer should come from persistent storage.

---

# Level 2B — Semantic Memory

Introduce:

```text
PostgreSQL
+
pgvector
+
embeddings
```

Architecture:

```text
User query
 ↓
Embedding
 ↓
Vector similarity search
 ↓
Relevant memories
 ↓
LLM context
 ↓
Answer
```

---

# Experiments

Store:

```text
The user likes backend development.

The user frequently works with Go.

The user uses PostgreSQL.

The user is interested in software architecture.
```

Ask:

```text
What technology is the user likely to use for backend services?
```

The exact words do not need to match.

---

# Learn

Understand:

```text
Embedding
Vector
Vector similarity
Semantic search
Retrieval
RAG
Memory
Context injection
```

Understand the difference between:

```text
RAG
```

and:

```text
Agent memory
```

---

# Memory Categories

Eventually support:

```text
Short-term memory
Long-term memory
Semantic memory
Episodic memory
Procedural memory
```

---

# Acceptance Criteria

The agent can:

- remember information across executions
- retrieve relevant memories
- perform semantic retrieval
- update memories
- delete memories
- avoid sending the entire database to the LLM

You can explain:

```text
Why use embeddings?

What is vector similarity?

What is retrieval?

What is RAG?

Why is memory different from conversation history?
```

---

# Level 3 — Multi-Agent System

## Objective

Understand specialized agents and orchestration.

Do not use LangGraph yet.

Implement orchestration manually.

---

# Agents

Create:

```text
Manager
Researcher
Writer
Reviewer
```

Architecture:

```text
                 Manager
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
    Researcher    Writer     Reviewer
        │           │           │
        └───────────┼───────────┘
                    ↓
                  Result
```

---

# Example Task

User:

```text
Research Redis Streams and create a technical article.
```

Workflow:

```text
Manager
 ↓
Researcher
 ↓
Research result
 ↓
Writer
 ↓
Draft
 ↓
Reviewer
 ↓
Review
 ↓
Writer
 ↓
Final article
```

---

# Learn

Understand:

```text
Agent specialization
Delegation
Agent communication
Shared context
Private context
Agent state
Handoff
Sequential workflow
Parallel workflow
Feedback loop
Supervisor
```

---

# Experiment — Parallel Agents

Run:

```text
Manager
 ├── Researcher A
 ├── Researcher B
 └── Researcher C
```

Then aggregate results.

Compare:

```text
Sequential execution
```

against:

```text
Parallel execution
```

Measure:

```text
latency
cost
result quality
conflicts
```

---

# Acceptance Criteria

Build a functioning multi-agent workflow without an orchestration framework.

You should understand:

```text
Why have multiple agents?

When is one agent better?

When does multi-agent architecture become wasteful?

How should agents communicate?

What information should be shared?

What should remain private?
```

---

# Level 4 — Scheduler + Autonomous Tasks

## Objective

Make agents run without direct user interaction.

Architecture:

```text
Scheduler
 ↓
Queue
 ↓
Worker
 ↓
Agent
 ↓
Tools
 ↓
Memory
 ↓
Result
```

---

# Stage 4A — Simple Scheduler

Start with a simple Node.js scheduler or cron.

Do not introduce Temporal yet.

Create:

```text
jobs/
└── daily-ai-research.ts
```

Example:

```text
Every day at 08:00
 ↓
Research AI news
 ↓
Summarize
 ↓
Store in memory
```

---

# Stage 4B — Redis + BullMQ

Install:

```text
Redis
BullMQ
```

Use Docker for Redis.

Architecture:

```text
Producer
 ↓
BullMQ
 ↓
Redis
 ↓
Worker
 ↓
Agent
```

---

# Learn

Understand:

```text
Queue
Worker
Job
Retry
Delayed job
Scheduled job
Concurrency
Job failure
Idempotency
Dead letter handling
```

---

# Experiments

Create:

```text
daily-research
weekly-summary
memory-cleanup
```

Test:

```text
worker crash
job failure
retry
duplicate execution
long-running task
```

---

# Level 4C — Autonomous Agent

Build an agent that:

```text
wakes up
 ↓
checks task
 ↓
decides what to do
 ↓
uses tools
 ↓
stores memory
 ↓
finishes
```

Understand the difference between:

```text
Scheduled workflow
```

and:

```text
Autonomous agent
```

---

# Acceptance Criteria

You can run an agent automatically without manually sending a prompt.

You understand:

```text
Why queues exist.

Why jobs need persistence.

Why retries can be dangerous.

Why idempotency matters.

Why autonomous agents need limits.
```

---

# Level 5 — MCP

## Objective

Understand the Model Context Protocol and standardized tool integration.

Architecture:

```text
Agent
 ↓
MCP Client
 ↓
MCP Server
 ↓
Tool
 ↓
External System
```

---

# Installation

Use the official MCP TypeScript SDK.

Do not simply consume existing MCP servers.

Build your own.

---

# Level 5A — MCP Server

Create:

```text
level-05-mcp/
├── client/
├── server/
└── README.md
```

Build tools such as:

```text
listFiles()
readFile()
writeFile()
```

---

# Level 5B — Custom Business Tools

Create tools such as:

```text
getProjectInfo()
getDatabaseSchema()
queryDatabase()
```

Use appropriate safety restrictions.

---

# Level 5C — Agent + MCP

Connect the Level 1 agent to your MCP server.

Architecture:

```text
Agent
 ↓
MCP Client
 ↓
MCP Server
 ├── filesystem
 ├── database
 └── custom API
```

---

# Learn

Understand:

```text
MCP Client
MCP Server
Tool
Resource
Prompt
Transport
Tool discovery
Tool invocation
```

Understand why MCP is useful compared with manually implementing every integration inside every agent.

---

# Security

Never give an experimental agent unrestricted access to:

```text
filesystem
shell
database
credentials
network
```

Use:

```text
allowlists
sandboxing
permissions
timeouts
approval
audit logging
```

---

# Level 6 — Agent Orchestration Framework

## Objective

Now introduce a framework.

Recommended starting point:

```text
LangGraph.js
```

The framework should NOT be your first exposure to agent orchestration.

You already built orchestration manually.

---

# Rebuild Level 3

Reimplement:

```text
Manager
Researcher
Writer
Reviewer
```

using the framework.

---

# Compare

Document:

```text
Manual implementation
```

versus:

```text
LangGraph implementation
```

Identify what the framework provides:

```text
State
Nodes
Edges
Persistence
Checkpoints
Branching
Retries
Human-in-the-loop
Workflow execution
```

---

# Acceptance Criteria

You can explain what LangGraph is doing internally.

You can map:

```text
Your manual implementation
```

to:

```text
Framework abstraction
```

You should be able to answer:

```text
What problem does LangGraph solve?

When should I use it?

When should I NOT use it?
```

---

# Level 7 — Agent Harness

## Objective

Understand what an AI Agent Harness provides.

A harness is the environment and control layer around an agent.

Conceptually:

```text
Agent Harness
│
├── Model
├── Prompt/context
├── Tools
├── MCP
├── Memory
├── Filesystem
├── Execution environment
├── Permissions
├── State
├── Lifecycle
├── Observability
└── Task management
```

---

# Platforms to Investigate

Evaluate:

```text
Multica AI
OpenHands
Claude Code
OpenAI Codex
other relevant agent harnesses
```

Use current official documentation when investigating them.

---

# Evaluation Matrix

For each harness document:

```text
Model support
Tool support
MCP support
Memory
Filesystem
Sandboxing
Permissions
Agent orchestration
Multi-agent support
Scheduling
Human approval
Observability
Persistence
Local execution
Cloud execution
Model replacement
Extensibility
```

---

# Important Experiment

Take something you already built manually.

For example:

```text
Research → Writer → Reviewer
```

Try implementing the same task with the harness.

Then answer:

```text
What did the harness automate?

What did it abstract?

What did I lose control over?

What did I gain?

Which architecture is easier to debug?

Which is easier to extend?
```

---

# Level 8 — Final AI Engineering Team

## Objective

Combine everything.

Build:

```text
AI Engineering Team
```

Agents:

```text
Manager
Architect
Researcher
Developer
Reviewer
QA
DevOps
```

---

# Final Architecture

```text
                         USER
                           │
                           ▼
                    ┌─────────────┐
                    │   Manager   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
    Architect          Researcher         Developer
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                       Reviewer
                           │
                           ▼
                           QA
                           │
                           ▼
                         DevOps
                           │
                           ▼
                      MCP Tools
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
         Git           PostgreSQL        Docker
                           │
                           ▼
                         Memory
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
               pgvector            Redis
                  │                 │
                  └────────┬────────┘
                           ▼
                       Scheduler
```

---

# Final Example

User:

```text
Build a Go REST API for managing products.
```

Manager:

```text
1. Ask Architect to design the architecture.
2. Ask Researcher to investigate relevant patterns.
3. Ask Developer to implement.
4. Ask Reviewer to review.
5. Ask Developer to fix problems.
6. Ask QA to test.
7. Ask DevOps to build and run.
8. Store important decisions in memory.
9. Return final report.
```

---

# Go Integration

Now introduce Go.

Create:

```text
level-08-final-project/
└── services/
    └── product-api/
```

Build a simple Go REST API.

Architecture:

```text
AI Agent
   │
   ▼
 MCP
   │
   ▼
 Go API
   │
   ▼
PostgreSQL
```

The purpose is to understand how AI agents interact with conventional backend systems.

---

# Observability

Add observability when the system becomes complex.

Recommended tool:

```text
Langfuse
```

Track:

```text
Agent
 ↓
LLM call
 ↓
Tool call
 ↓
Tool result
 ↓
LLM call
 ↓
Agent result
```

Measure:

```text
latency
tokens
cost
errors
tool failures
workflow duration
agent execution
```

---

# Model Abstraction

Avoid hard-coding agents to one provider.

Architecture:

```text
Agent
 ↓
Model Interface
 ↓
Provider Adapter
 ├── OpenAI
 ├── Anthropic
 ├── Gemini
 └── Local model
```

The same agent should ideally be able to use different models.

Experiment with:

```text
cheap model
fast model
reasoning model
coding model
```

Understand when each is appropriate.

---

# Memory Architecture

The final system should distinguish:

```text
Conversation
     ↓
Current context

Short-term memory
     ↓
Current task state

Long-term memory
     ↓
Persistent knowledge

Semantic memory
     ↓
Facts retrieved by meaning

Episodic memory
     ↓
Past events

Procedural memory
     ↓
How tasks are performed
```

---

# Security Architecture

Agents should be treated as potentially dangerous software components.

Implement:

```text
Tool allowlists
Permission boundaries
Sandboxing
Timeouts
Rate limits
Resource limits
Human approval
Audit logs
Secret isolation
Database access restrictions
```

Never allow an experimental agent unrestricted:

```text
shell execution
filesystem access
database writes
Git operations
network access
credential access
```

---

# Failure Experiments

Intentionally test:

```text
LLM unavailable
LLM timeout
Invalid JSON
Invalid tool arguments
Tool failure
Database unavailable
Redis unavailable
MCP server unavailable
Agent infinite loop
Agent hallucinated tool
Agent gives conflicting instructions
Two agents disagree
Job executes twice
Memory contains incorrect information
Agent attempts unauthorized action
```

For each failure document:

```text
What happened?

Why did it happen?

How did we detect it?

How did we recover?

How would production systems handle it?
```

---

# Required Documentation Per Level

Every level must contain:

```text
README.md
```

The README should contain:

```text
# What I built

# Architecture

# Installation

# How to run

# Experiments

# What I learned

# Problems encountered

# Solutions

# Important concepts

# Trade-offs

# What I still don't understand

# Acceptance criteria
```

---

# Git Strategy

Commit after meaningful milestones.

Example:

```text
feat(level-0): create basic llm client
feat(level-1): add calculator tool
feat(level-1): add tool error handling
feat(level-2): add persistent memory
feat(level-2): add semantic retrieval
feat(level-3): add manager agent
feat(level-3): add reviewer loop
```

Avoid one giant commit per level.

---

# Completion Checklist

## Level 0

- [ ] LLM API works
- [ ] Environment variables
- [ ] Messages
- [ ] Context
- [ ] Tokens
- [ ] Streaming
- [ ] Structured output
- [ ] Errors
- [ ] Retries

## Level 1

- [ ] Agent loop
- [ ] Calculator
- [ ] Time tool
- [ ] Tool selection
- [ ] Tool validation
- [ ] Tool errors
- [ ] Maximum iterations
- [ ] Unknown tool handling

## Level 2

- [ ] PostgreSQL
- [ ] Persistent memory
- [ ] Memory manager
- [ ] pgvector
- [ ] Embeddings
- [ ] Semantic retrieval
- [ ] Memory updates
- [ ] Memory deletion
- [ ] RAG understanding

## Level 3

- [ ] Manager
- [ ] Researcher
- [ ] Writer
- [ ] Reviewer
- [ ] Agent communication
- [ ] Delegation
- [ ] Sequential workflow
- [ ] Parallel workflow
- [ ] Feedback loop

## Level 4

- [ ] Scheduler
- [ ] Redis
- [ ] BullMQ
- [ ] Queue
- [ ] Worker
- [ ] Retry
- [ ] Delayed jobs
- [ ] Job persistence
- [ ] Idempotency
- [ ] Autonomous task

## Level 5

- [ ] MCP client
- [ ] MCP server
- [ ] Custom MCP tool
- [ ] Tool discovery
- [ ] Agent + MCP
- [ ] MCP security

## Level 6

- [ ] LangGraph.js
- [ ] State
- [ ] Nodes
- [ ] Edges
- [ ] Persistence
- [ ] Checkpoints
- [ ] Branching
- [ ] Human-in-the-loop

## Level 7

- [ ] Agent harness concept
- [ ] Multica evaluation
- [ ] OpenHands evaluation
- [ ] Claude Code evaluation
- [ ] Codex evaluation
- [ ] Harness comparison

## Level 8

- [ ] AI Engineering Team
- [ ] Manager
- [ ] Architect
- [ ] Researcher
- [ ] Developer
- [ ] Reviewer
- [ ] QA
- [ ] DevOps
- [ ] Shared memory
- [ ] Private memory
- [ ] MCP
- [ ] Scheduler
- [ ] Model abstraction
- [ ] Observability
- [ ] Security
- [ ] Go integration

---

# Definition of Success

At the end of this project, you should be able to look at an AI agent system and explain:

```text
Where is the model?

Where is the agent loop?

Where is state?

Where is memory?

How does retrieval work?

How does the agent call tools?

How does MCP fit?

How do agents communicate?

How are tasks scheduled?

How are jobs persisted?

How are failures handled?

How is the agent sandboxed?

How are permissions enforced?

How is the system observed?

How can I change the model?

How can I change the memory?

How can I change the orchestration framework?

What does the agent harness provide?
```

The ultimate goal is:

```text
Understand the abstractions
        ↓
Build simplified versions yourself
        ↓
Use frameworks
        ↓
Understand what the frameworks abstract
        ↓
Evaluate agent harnesses
        ↓
Design your own architecture
```

You should finish this project understanding AI agents as an **engineering system**, not just as a prompting technique.

---

# Rules for the Local AI Coding Agent

The AI coding agent working on this repository MUST follow these rules:

1. Read this file before making architectural decisions.
2. Work on one level at a time.
3. Never implement future levels without explicit instruction.
4. Install only dependencies required for the current level.
5. Explain why each dependency is needed.
6. Prefer official documentation for current APIs.
7. Use TypeScript.
8. Do not introduce Python unless explicitly justified.
9. Do not hide fundamental concepts behind frameworks.
10. Write tests for important behavior.
11. Deliberately test failure cases.
12. Document discoveries.
13. Keep each level isolated.
14. Keep secrets out of Git.
15. Stop when the current level's acceptance criteria are satisfied.
16. Do not automatically continue to the next level.
17. When there are multiple valid architectures, explain the trade-offs.
18. If something is unclear, create a small experiment instead of guessing.
19. Prefer simple implementations over unnecessary abstractions.
20. The purpose of this repository is learning, not premature production optimization.

---

# Final Principle

Do not ask:

> "Which AI framework should I use?"

Ask:

> "What problem am I trying to solve?"

Then:

```text
Understand the problem
        ↓
Build the simplest solution
        ↓
Observe its limitations
        ↓
Introduce an abstraction
        ↓
Compare alternatives
        ↓
Understand the trade-offs
```

This is the core learning methodology for the entire playground.