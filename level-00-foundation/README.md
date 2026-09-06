# Level 0 — LLM Fundamentals

## What I built

A minimal Node.js + TypeScript program that sends a single prompt to an LLM
over HTTP and prints the response. No agent loop, no tools, no memory —
just the raw request/response mechanics of calling a model.

Three scripts:

- `src/index.ts` — one-shot prompt/response call.
- `src/streaming.ts` — same call, but reads the response incrementally via
  Server-Sent Events instead of waiting for the full completion.
- `src/structured-output.ts` — asks the model to return JSON and attempts
  to `JSON.parse()` it, to show that "structured output" is a prompting
  convention, not a guarantee.

## Architecture

```
User (CLI arg)
  ↓
Node.js script (tsx runs .ts directly, no build step)
  ↓
fetch() → POST {LLM_BASE_URL}/chat/completions
  ↓
LLM gateway (OpenAI-compatible chat completions API)
  ↓
JSON response { choices[0].message.content, usage }
  ↓
printed to terminal
```

No SDK is used — plain `fetch()` — so every part of the HTTP request and
response is visible and explicit, which is the point of Level 0.

## Installation

```bash
npm install dotenv
npm install -D typescript tsx @types/node
```

No LLM provider SDK was installed. The chat completions API used here is
OpenAI-compatible (works the same whether you point `LLM_BASE_URL` at
OpenRouter, an OpenAI-compatible internal gateway, or similar), so a plain
`fetch()` call was enough — installing a client library would have hidden
the request/response mechanics this level is meant to teach.

## Environment variables

```env
LLM_PROVIDER=openrouter
LLM_API_KEY=your-key-here
LLM_MODEL=your-model-slug
LLM_BASE_URL=https://openrouter.ai/api/v1
```

`LLM_BASE_URL` matters because "OpenAI-compatible chat completions API" is
a shape, not a single vendor — OpenRouter, a self-hosted gateway, and other
providers all implement the same `/chat/completions` contract at different
hosts.

## How to run

```bash
npm run level0                  # basic call, default prompt
npm run level0 -- "What is Go?" # basic call, custom prompt
npm run level0:stream           # streaming variant
npm run level0:structured       # JSON-output variant
npm run typecheck               # compile-check without emitting files
```

## Experiments run

1. **Basic prompt** — "Explain Redis Streams." → full markdown explanation,
   ~31 prompt tokens / ~1016 completion tokens.
2. **Constrained prompt** — "...in exactly 3 bullet points" via the
   streaming script → model mostly honored the constraint; text arrived in
   incremental chunks rather than all at once.
3. **Structured output** — asked for strict JSON
   (`{topic, summary, difficulty}`) → model returned valid JSON that
   `JSON.parse()`'d successfully on this run. This is not guaranteed on
   every run; a model can still emit prose, markdown fences, or malformed
   JSON. (Real validation is deferred to Level 1 with Zod.)
4. **Invalid API key** → HTTP `401`, body `{"error": "Invalid token"}`.
   Fails before the request reaches any model.
5. **Unknown model slug** → HTTP `404`,
   `{"error": "Model not found in routing config: ..."}`. Auth succeeds,
   but the gateway can't route to a model that doesn't exist.
6. **Insufficient account credit** (hit once against the direct Anthropic
   API before switching providers) → HTTP `400`,
   `{"error": {"type": "invalid_request_error", "message": "Your credit
   balance is too low..."}}`. Auth and routing succeed; billing blocks it.

Three different HTTP status codes (401 / 404 / 400) for three different
failure causes — the error response tells you *where* in the pipeline the
request died.

## What I learned

- **LLM API call**: a single stateless HTTPS request. The server has no
  memory of previous calls — every "conversation" is really the full
  message history re-sent every time.
- **Context**: the entire `messages` array sent in the request body. It is
  the *only* thing the model sees; nothing persists between calls unless
  you resend it.
- **Token**: the unit the model reads/writes in and the unit billing is
  measured in (`usage.prompt_tokens` / `completion_tokens`). Not the same
  as words or characters.
- **System vs. user message**: `system` sets standing behavior/persona for
  the whole call; `user` is the actual request. The model treats them with
  different weight/priority, not just as two strings concatenated.
- **Streaming**: the response arrives as a sequence of Server-Sent Events
  instead of one blocking payload. Same total content, different delivery
  — useful for perceived latency (`time-to-first-token`) in UIs, not for
  correctness.
- **Structured output**: "return JSON" is a prompt instruction the model is
  trained to follow well, not a schema the API enforces. Parsing can still
  fail — that's why real systems validate the output (Zod, JSON Schema
  mode, etc.) instead of trusting it blindly.
- **API error**: the API fails fast with a specific HTTP status + JSON body
  describing exactly what went wrong (auth vs. routing vs. billing vs.
  malformed request) — errors are structured data, not just an exception
  string.
- **Why API keys must never be hardcoded**: a key hardcoded in source ends
  up in git history, forks, and anywhere the repo is cloned — irrevocable
  even after later removal. `.env` + `.gitignore` keeps the secret out of
  version control entirely; only `.env.example` (with blank values) is
  committed.

## Problems encountered

- Initially built this against the direct Anthropic Messages API using
  `@anthropic-ai/sdk`. Hit a `400 invalid_request_error` — the API account
  had no credit balance (Claude.ai Pro subscription and Anthropic API
  billing are entirely separate accounts/products).
- Switched to an OpenAI-compatible gateway instead (OpenRouter-style
  `/chat/completions`), driven by `LLM_BASE_URL` + `LLM_MODEL` env vars
  rather than a hardcoded host, since "OpenAI-compatible" describes a
  contract many different hosts implement.

## Solutions

- Removed `@anthropic-ai/sdk` entirely once switched to the OpenAI-
  compatible gateway; replaced with plain `fetch()`, which works for any
  host implementing the same chat-completions shape.
- Added `LLM_BASE_URL` to `.env` / `.env.example` so the endpoint is
  configurable rather than hardcoded into the client.

## Important concepts

LLM, Model, Prompt, Message, System message, User message, Assistant
message, Token, Context window, Temperature, Streaming, Structured output,
API error, Rate limit, Retry.

## Trade-offs

- **Raw `fetch()` vs. an SDK client**: chose raw `fetch()` for maximum
  visibility into the request/response shape at this level, at the cost of
  manually parsing SSE chunks and JSON error bodies (an SDK would do this
  for you, along with retries and typed responses).
- **No retry logic yet**: a failed request just exits. Real systems retry
  transient failures (5xx, rate limits) with backoff — deliberately not
  implemented yet since Level 0 is about seeing raw failures, not masking
  them.

## What I still don't understand

(Fill in after your own review — this is meant to be answered by you, not
pre-written for you.)

## Acceptance criteria

Can explain:

- [x] What is an LLM API call?
- [x] What is context?
- [x] What is a token?
- [x] What is streaming?
- [x] Why should API keys never be hardcoded?
- [x] What happens when an API request fails?
- [x] What is the difference between system and user instructions?
