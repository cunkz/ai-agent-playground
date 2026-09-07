# Architecture

This project is an incremental curriculum for learning AI agent
engineering, built level by level in Node.js and TypeScript. Each level
lives in its own top-level folder (level-00-foundation, level-01-single-
agent, level-02-memory, and so on) and later levels are allowed to import
already-built code from earlier levels, but never the other way around.

Level 0 established the lowest layer: a plain fetch() call to an OpenAI-
compatible chat completions endpoint, with no SDK installed, so the raw
request and response shape stays visible. No agent loop exists at this
level, just a single prompt in and a single response out.

Level 1 built the agent loop on top of that. The loop lives in agent.ts
and works like this: send the conversation state plus a list of available
tools to the model, check whether the model asked to call a tool, and if
so, validate the arguments with Zod, execute the tool, and feed the result
back into the conversation before calling the model again. This repeats
until the model produces a plain answer with no tool call, or until a
maximum iteration limit is reached, whichever comes first. Two tools were
built at this level: a calculator and a current-time lookup. Tools are
represented as small objects with a name, a description, a JSON Schema for
their parameters, a Zod schema for runtime validation, and an execute
function.

Level 2 introduced persistent memory without changing the agent loop at
all. Two new tools, remember and recall, were added using the exact same
tool shape as the calculator and time tools from Level 1. This is the
core architectural point of the whole curriculum so far: the agent loop
is generic over whatever tools it's given, so adding a new capability
means writing new tool files, not modifying the loop.

The chat model and the embedding model come from two separate gateways,
configured independently through environment variables (LLM_BASE_URL /
LLM_MODEL for chat, EMBEDDING_BASE_URL / EMBEDDING_MODEL for embeddings).
This split exists because the chat gateway's model turned out to only
support chat completions, not embeddings, when it was probed directly.
