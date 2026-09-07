# AI Agent Playground

A hands-on curriculum for learning AI Agent Engineering from first
principles, one level at a time. See [AI_AGENT_PLAYGROUND.md](./AI_AGENT_PLAYGROUND.md)
for the full curriculum, tech stack per level, and rules for how this
repo is meant to grow.

Primary stack: **Node.js + TypeScript**.

## Status

- [x] [Level 0 — LLM Fundamentals](./level-00-foundation/README.md)
- [x] [Level 1 — Single Tool-Using Agent](./level-01-single-agent/README.md)
- [ ] Level 2 — Memory + RAG
- [ ] Level 3 — Multi-Agent System
- [ ] Level 4 — Scheduler + Autonomous Tasks
- [ ] Level 5 — MCP
- [ ] Level 6 — Agent Orchestration Framework
- [ ] Level 7 — Agent Harness
- [ ] Level 8 — Final AI Engineering Team

## Setup

```bash
npm install
cp .env.example .env   # then fill in LLM_API_KEY / LLM_MODEL / LLM_BASE_URL
```

Each level lives in its own `level-NN-*/` directory with its own
`README.md` documenting what was built, how to run it, and what was
learned.
