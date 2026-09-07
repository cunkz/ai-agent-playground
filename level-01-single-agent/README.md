# Level 1 — Single Tool-Using Agent

## Objective

Build a manual agent loop — no framework — that can decide for itself
whether a task needs a tool, execute that tool safely, and continue
reasoning with the result until it produces a final answer.

## Architecture

```
User prompt
   ↓
Agent state (messages: system, user, assistant, tool)
   ↓
LLM (sent: messages + tool specs)
   ↓
finish_reason === "tool_calls" ?
   │
   ├── No  ──→ final answer, loop ends
   │
   └── Yes ──→ for each requested tool call:
                  1. look up tool by name       (unknown → controlled error)
                  2. JSON.parse arguments        (malformed → controlled error)
                  3. Zod validate arguments      (invalid → controlled error)
                  4. execute()                   (throws → controlled error)
                  5. push result as role:"tool" message
              ↓
        loop continues (iteration++), up to MAX_ITERATIONS
```

This is built on the LLM API's **native function-calling** support
(`tools` request field, `tool_calls` in the response) — confirmed working
against this project's gateway before writing any loop code, rather than
assumed. No manual "ask the model to emit JSON in plain text" fallback was
needed.

## Installation

```bash
npm install zod
```

No LLM SDK — continuing Level 0's raw `fetch()` approach, now extracted
into a small shared client (`src/llm.ts`) since the agent calls it
repeatedly inside a loop instead of once per script.

## How to Run

```bash
npm run level1 -- "What is 125 * 37?"
npm run level1:test-tools          # deterministic tool-validation tests (no network)
MAX_ITERATIONS=1 npm run level1 -- "Calculate 125 * 37, then add 10, then tell me the time in Asia/Jakarta."
```

## How the Agent Loop Works

Each iteration:

1. Send the full message history + tool specs to the LLM.
2. Append whatever the model replied (text and/or tool calls) to the state.
3. If it didn't request a tool, that's the final answer — stop.
4. If it did, run each requested tool, and push the result back into the
   state as a `role: "tool"` message tied to that specific `tool_call_id`.
5. Send the updated state back to the LLM and repeat.

The loop exists because a single request/response round-trip cannot
incorporate information the model doesn't have yet (a calculation result,
the current time). The model has to see the tool's output before it can
write a final answer that uses it — hence "loop until no more tools are
requested."

## Tool Calling

```
LLM decides a tool is needed
  → emits { name, arguments } as JSON (arguments is a JSON *string*, not
    an object — it must be parsed before validation)
  → our code looks the tool up by name, parses, validates, executes
  → result is sent back as a new message, tagged with tool_call_id so the
    model can match results to the calls it made
  → LLM continues reasoning with that result in context
```

## State Management

State is one explicit array (`ChatMessage[]`) held in a local variable in
`agent.ts` — nothing implicit, nothing hidden inside a library. It holds:

- the system instruction (set once)
- the user's task (set once)
- every assistant turn, including any tool calls it made
- every tool result, tied back to the call that produced it

This is the concrete answer to "an agent is not `prompt → response`": the
array *is* the state that survives across iterations, and it grows by one
or more entries every iteration until the loop ends.

## Validation

Tool arguments come from the model's own text generation — they are not
inherently well-typed or safe, even though the model was given a JSON
schema to follow. It can still omit a required field, use the wrong type,
or (rarer, but real) invent a value outside an enum. `tool.schema.safeParse()`
is the boundary between "the model's guess at valid input" and "input our
own tool code will actually execute" — the same reason you'd validate any
external, untrusted input at a system boundary.

## Error Handling

| Failure | Handling |
|---|---|
| Unknown tool name | Looked up in a `Map`; a miss returns a `role:"tool"` error message instead of throwing. |
| Malformed JSON in `tool_call.function.arguments` | `JSON.parse` wrapped in try/catch; failure returns a controlled error message. |
| Invalid arguments (wrong type / bad enum / missing field) | `zod.safeParse()`; failure returns the Zod issue list as the tool's "result". |
| Tool execution throws (e.g. divide by zero) | try/catch around `execute()`; the thrown message becomes the tool's error result. |
| LLM/API failure (non-2xx from the gateway) | Not treated as a tool error — it aborts the whole run via `LlmApiError`, caught once at the top level in `index.ts`. The error body is printed, but never the API key. |

The first four categories are deliberately **fed back to the model as
`role:"tool"` messages** rather than crashing the process — the model can
see "that operation doesn't exist" or "division by zero" and often adjust
its next move (as seen in testing: the model sometimes self-corrects
before ever emitting an invalid call once it also has the tool's schema).
An LLM/API-level failure is different in kind — it's not something the
model can route around, so it stops the run instead of masquerading as a
tool result.

## Maximum Iterations

`MAX_ITERATIONS` (default 10, overridable via env var for testing) caps
the loop. Without it, a model that keeps requesting tools (or gets stuck
re-requesting after a tool error) would run — and be billed — forever.
Verified directly: with `MAX_ITERATIONS=1` and a task needing at least two
sequential tool calls, the agent stopped after iteration 1 with a
controlled `"Stopped: reached the maximum..."` message instead of hanging.

## Test Scenarios

| # | Scenario | Result |
|---|---|---|
| 1 | "What is an AI agent?" | 1 iteration, no tool call, direct answer. |
| 2 | "What is 125 * 37?" | `calculator(multiply, 125, 37)` → `4625` → final answer. |
| 3 | "Calculate 125 * 37 and tell me the current time." | Model called both `calculator` and `getCurrentTime` (in one turn, in this run) — the loop handles any number of calls per turn generically, nothing hardcoded. |
| 4 | Invalid calculator operation | The live model self-refused once shown the schema's enum, so the failure path was verified directly instead: `npm run level1:test-tools` fabricates a `tool_call` with `operation: "power"` and confirms Zod rejects it. |
| 5 | Division by zero | Verified directly in `level1:test-tools`: `calculator(divide, 10, 0)` throws `"Division by zero is not allowed."`, caught and returned as a controlled tool error. |
| 6 | Maximum iterations | `MAX_ITERATIONS=1` against a task needing 2+ sequential tool calls → agent stopped safely with the max-iterations message. |
| — | LLM/API failure | Invalid API key → `LlmApiError` with HTTP 401, printed without exposing the key, process exits non-zero. |

`npm run level1:test-tools` also covers two cases beyond the curriculum's
list, for completeness: an unknown tool name, and malformed JSON in the
tool call's arguments string.

## What I Learned

- Native function-calling (`tools`/`tool_calls`) means the model returns
  *structured* intent (a name + a JSON string of arguments), not text you
  have to parse out of a sentence — this is what makes reliable tool
  dispatch possible at all.
- A schema shown to the model (JSON Schema, via `tools`) and a schema used
  to validate at runtime (Zod) are two separate things that happen to
  describe the same shape. The model respecting the JSON Schema doesn't
  make runtime validation redundant — a differently-behaved or
  differently-hosted model might not.
- Tool errors and API errors are fundamentally different failure classes:
  one is recoverable by the model (it can try something else), the other
  isn't (there's no model to hand a routing/auth failure back to).

## Limitations

- No conversation memory across separate `npm run level1` invocations —
  each run starts a fresh state (that's Level 2's problem).
- JSON Schema for each tool's `parameters` is written by hand alongside its
  Zod schema, rather than derived from one source. For two tools this
  duplication is small and explicit; a real system would likely generate
  one from the other (e.g. via a zod-to-JSON-Schema conversion) rather
  than hand-maintain both indefinitely.
- No retries on transient LLM API failures (5xx, rate limits) — a failure
  aborts the run rather than backing off and retrying. Deliberately out of
  scope for this level.
- `getCurrentTime`'s timezone handling is whatever `Intl.DateTimeFormat`
  supports for IANA timezone strings on the host Node runtime — no custom
  timezone database or DST logic was built.

## Acceptance Criteria

From `AI_AGENT_PLAYGROUND.md`, the agent must:

- [x] understand available tools — tool specs (name/description/JSON schema) sent to the LLM every call via `tools`
- [x] select the correct tool — verified in Test 2 (`calculator`) and Test 3 (`calculator` + `getCurrentTime`)
- [x] provide arguments — model emits `{operation, a, b}` / `{timezone}` as structured JSON
- [x] execute the tool — `tool.execute()` invoked after validation passes
- [x] receive the result — result pushed back as a `role:"tool"` message tied to `tool_call_id`
- [x] continue processing — loop re-calls the LLM with the updated state until no more tools are requested
- [x] produce a final answer — `finish_reason` without `tool_calls` ends the loop with `stoppedReason: "final_answer"`
- [x] stop safely — verified via `MAX_ITERATIONS=1` (Test 6): controlled message, no crash, no infinite loop

Curriculum completion checklist:

- [x] Agent loop — `runAgent()` in `agent.ts`
- [x] Calculator — `tools/calculator.ts`, add/subtract/multiply/divide
- [x] Time tool — `tools/time.ts`, optional IANA timezone
- [x] Tool selection — model chooses via native function-calling, not string-matching on the prompt
- [x] Tool validation — Zod `safeParse`, verified against 3 invalid-input cases in `level1:test-tools`
- [x] Tool errors — unknown tool, malformed JSON, invalid args, and thrown execution errors (divide by zero) all return controlled `role:"tool"` messages instead of crashing
- [x] Maximum iterations — `MAX_ITERATIONS` env-configurable guard, verified stopping mid-task
- [x] Unknown tool handling — verified in `level1:test-tools`

You should be able to draw the agent loop from memory — see the diagram
at the top of this file, or the "How the Agent Loop Works" section above.

## Why We Are Not Using a Framework Yet

The curriculum's point stands after actually building this: a framework
like LangGraph would give you the loop, the state container, and the tool
dispatch/validation wiring "for free" — but having now hand-written all of
that, it's clear what those abstractions are actually doing underneath.
Level 6 revisits this same Manager/Researcher/Writer/Reviewer-style
problem with a framework specifically so that comparison is concrete
instead of theoretical.
