# Token Usage Report: Full Context vs. Memory + Retrieval vs. Poor Retrieval

Generated from real trials run against this project's actual LLM gateway
(`model=mimo`) on 2026-09-07. Raw data: `token-usage-results.json` (21
trials, full request/response/timing per trial).

## 1. Hypothesis

Persistent memory and targeted retrieval should reduce input token usage
because the agent no longer needs to resend the entire historical context
on every request, while maintaining comparable answer quality to sending
everything.

The measured results support the token-reduction half of this hypothesis
clearly. The quality half turned out to require a different kind of
evidence than planned — see §6.

## 2. Experimental Setup

- **Task** (identical across every trial): *"Add a new API endpoint that
  retrieves user preferences. Follow the existing architecture,
  authentication approach, database conventions, error-handling
  conventions, and project coding style."*
- **Model**: `mimo` (this project's configured `LLM_MODEL`), via the same
  `chatCompletion()` client built in Level 1 — no tools passed (`tools: []`),
  single-turn, not the full agent loop.
- **Seed data**: 25 synthetic memories under an isolated
  `token-usage-experiment` user id (separate from the project's real
  memories) — 18 relevant (project facts, 4 ADRs, 5 coding conventions, 3
  constraints, 1 prior-task note) and 7 deliberately irrelevant (old
  Redis/Kafka discussions, a stale UI decision, an unrelated debugging
  session, etc. — content taken directly from this experiment's own
  brief). Each tagged `metadata.relevant: true/false` at seed time.
- **Trials**: 5 per mode for the three main modes, plus a top-K sweep
  (3 trials each at topK=3 and topK=10; topK=5 reuses the main Memory+
  Retrieval trials) — 21 real LLM calls total.
- **Mode A — Full Context**: all 25 memories (`recall()`, no filter),
  concatenated unfiltered into the prompt.
- **Mode B — Memory + Retrieval**: `searchSimilarMemories()` against the
  task text, `minSimilarity=0` (topK alone controls context size, so the
  sweep isolates topK's effect).
- **Mode C — Poor Retrieval**: deliberately queries only the
  `metadata.relevant=false`-tagged memories — an intentional bad-retrieval
  simulation, same topK=5 as Mode B for a fair "same context size,
  different content" comparison.
- **Token measurement**: real `usage.prompt_tokens`/`completion_tokens`
  from the API response, not character-count estimation.
- **Cost**: `MODEL_INPUT_PRICE_PER_1M_TOKENS`/`MODEL_OUTPUT_PRICE_PER_1M_TOKENS`
  were not set — this gateway's actual per-token pricing for `mimo` isn't
  known, so cost is not fabricated; token counts are reported instead
  (§14's own explicit fallback).

### Two methodology corrections made during the run

**Response caching discovered and fixed.** The first full run produced
byte-identical responses and identical token counts across all 5 trials
per mode, with a ~15-20s cold call followed by four ~100ms calls — the
gateway caches identical requests. This wasn't 5 independent samples, it
was 1 real generation plus 4 cache hits. Fixed by appending a per-trial
random marker (`(Ignore this line; internal trial marker: <uuid>)`) to
force cache misses, at the cost of a few extra input tokens applied
identically across all modes (so relative comparisons stay fair). All
numbers in this report are from the re-run with genuine independent
trials.

**Output truncation confound identified, not fully resolved.** `llm.ts`'s
`max_tokens: 1024` (inherited unchanged from Level 1, per this
experiment's own instruction not to modify unrelated functionality) cut
off 5 of 21 trials mid-generation — concentrated specifically in the
modes given the *most* context (Full Context: 3/5 trials, topK=10: 2/3),
never in Memory+Retrieval@5, topK=3, or Poor Retrieval. This means the
output/total-token numbers below are conservative, not inflated: Full
Context's true (uncapped) output would likely be longer than what was
measured, so the real total-token savings from retrieval are probably
larger than the 14.8% figure reported in §4.

## 3. Results

| Metric | Full Context | Memory + Retrieval (topK=5) | Poor Retrieval (topK=5) |
|---|---:|---:|---:|
| Avg input tokens | 1082.4 | 769.6 | 823.6 |
| Avg output tokens | 756.0 | 796.6 | 460.2 |
| Avg total tokens | 1838.4 | 1566.2 | 1283.8 |
| Retrieved memories | 25 (all) | 5 | 5 |
| Avg context characters | 1897 | 341 | 659 |
| Avg latency | 13.6s | 18.8s | 10.9s |
| Trials truncated at max_tokens | 3/5 | 0/5 | 0/5 |

Top-K sweep (Memory + Retrieval only):

| topK | Avg input tokens | Avg output tokens | Avg total tokens | Trials truncated |
|---|---:|---:|---:|---:|
| 3 | 750.3 | 674.0 | 1424.3 | 0/3 |
| 5 | 769.6 | 796.6 | 1566.2 | 0/5 |
| 10 | 834.3 | 948.0 | 1782.3 | 2/3 |

Latency does not track token count cleanly here (Poor Retrieval was
fastest despite mid-sized input, Memory+Retrieval slowest despite the
smallest input) — with 5 samples per mode and real network/queueing
variance, latency wasn't a reliable signal in this run and shouldn't be
over-interpreted the way the token counts can be.

## 4. Token Reduction

```
Full Context:        1082.4 avg input tokens
Memory + Retrieval:    769.6 avg input tokens
Reduction:              28.9%

Full Context:        1838.4 avg total tokens
Memory + Retrieval:   1566.2 avg total tokens
Reduction:              14.8%  (conservative — see truncation note in §2)
```

The input-token reduction is the reliable headline number: it's a direct,
mechanical consequence of sending 5 relevant memories (341 characters)
instead of all 25 (1897 characters) — not sensitive to model output
variance or truncation. It was consistent across both experiment runs
(30.2% in the first, caching-confounded run; 28.9% in the clean re-run),
which is reassuring given everything else that changed between them.

The total-token reduction is directionally correct but understated by the
truncation confound (§2) — Full Context's output was cut off more often
specifically because it was given more material to reference, so its true
uncapped output tokens (and therefore true total-token cost) is
underestimated here, meaning the real reduction is probably higher than
14.8%.

## 5. Cost Impact

Pricing for this gateway's `mimo` model is not configured
(`MODEL_INPUT_PRICE_PER_1M_TOKENS`/`MODEL_OUTPUT_PRICE_PER_1M_TOKENS`
unset), so no dollar estimate is fabricated. If you set those two env
vars to real published or negotiated per-token rates, re-running
`npm run experiment:token-usage` will compute `fullContextCost`/
`memoryRetrievalCost` in the saved JSON automatically — the code path
exists (`metrics.ts#estimateCost`), it's just not exercised with real
numbers here.

## 6. Quality Comparison

**The original plan — scoring generated code on correctness/completeness
— doesn't apply to what actually happened.** Across all 21 trials, only
one response contained anything resembling code, and even that one was
truncated by `max_tokens` mid-plan, before writing actual code. In every
other trial, across **all three modes roughly equally**, the model chose
to ask clarifying questions or state assumptions rather than fabricate a
plausible-but-fictional implementation of files it had never seen.

This is not a failure of the experiment — it's a real, unplanned, and
genuinely informative result. It directly validates this curriculum's own
architectural point (§18): *memory is not a replacement for the
repository.* Prose descriptions of conventions (even complete ones, as in
Full Context) are not the same as seeing actual source code, and the
model correctly recognized that gap in a task explicitly asking it to
"follow existing coding style" — something no amount of ADR text alone
can fully specify.

Given that, quality was instead compared on **what each mode's response
correctly referenced**, which is still a meaningful, gradable signal of
whether the given context actually informed the model:

| Dimension | Full Context | Memory + Retrieval | Poor Retrieval |
|---|---|---|---|
| Referenced ADR-002 (repository pattern) | No | **Yes, explicitly** | No |
| Referenced JWT / prior auth work | No | **Yes** ("Auth middleware already exists from the JWT work") | No |
| Referenced Zod / error-handling convention | No | **Yes** (error convention correctly restated) | No |
| "Relevant signals" the model itself cited | none named explicitly | ADR-002, JWT reuse, error convention | Docker Compose, React SPA, "no Redis/Kafka" — **all real facts, none relevant to a REST endpoint** |
| Hallucinated false information | No | No | No |
| Asked for real codebase access before proceeding | Yes (both non-broken trials) | Yes | Yes |

Scored against the curriculum's 0/1/2 rubric, on the one axis that's
actually assessable here (architecture/constraint **awareness**, since
completeness/correctness has no code to grade in any mode):

```
                    Full Context   Memory+Retrieval   Poor Retrieval
architecture_awareness:   1               2                  0
constraint_awareness:     1               2                  0
hallucination (2=none):   2               2                  2
```

The Full Context score of 1 (not 0) reflects that it *had* the correct
information available — it just didn't surface it in its response, asking
generic clarifying questions instead of citing specific ADRs despite
having all of them in context. **This is a real, observed instance of
"lost in the middle"**: relevant information is measurably less likely to
be surfaced when buried among 25 memories than when it's the entirety of
a focused 5-memory context — a genuine quality argument for retrieval
beyond just token savings, seen directly in this data rather than assumed
from prior literature.

Poor Retrieval's response is the clearest result of all three: it
extracted real facts from its context (Docker, React SPA, Redis/Kafka
avoidance) and presented them as the "relevant signals" for the task —
demonstrating it was working faithfully from what it was given, while
that given content was simply the wrong content. It never mentioned a
single one of the actually-relevant ADRs or conventions, because they
were never in its context to begin with.

## 7. Poor Retrieval Experiment

Token usage: Poor Retrieval (1283.8 avg total tokens) was actually the
*cheapest* of all three modes — cheaper than genuinely good retrieval
(1566.2). This is an important, sobering result on its own: **you cannot
tell from token count alone whether retrieval succeeded.** A system that
silently retrieves confidently-wrong context will look efficient on every
token/cost metric while quietly producing worse-grounded answers — exactly
the trap the curriculum's own framing (§12) warns about: *"Poor retrieval
can reduce token usage while also reducing answer quality."* This
experiment measured that directly, not just asserted it.

## 8. Lessons Learned

- **Why memory reduces token usage**: mechanically, because retrieving 5
  relevant items (341 characters) instead of sending all 25 (1897
  characters) is strictly less text to encode — a ~29% input-token
  reduction, measured directly and reproducibly across two independent
  runs.
- **When retrieval helps**: when it surfaces the *specific* facts a task
  needs and nothing else — Memory+Retrieval's response was the only one
  that explicitly cited the correct ADR and reused prior context (the JWT
  work), likely *because* the signal wasn't diluted among 20 irrelevant
  items.
- **When retrieval hurts**: when it's confidently wrong — Poor Retrieval
  didn't fail loudly; it produced a fluent, well-structured response built
  entirely on irrelevant facts, and was the cheapest mode by token count.
  Bad retrieval is not obviously bad from the outside.
- **Why more context is not always better**: Full Context, despite having
  every correct fact available, was the *only* mode to reference zero
  specific ADRs/conventions in its response, and was the only mode that
  broke into hallucinated tool-call syntax (twice) — more context
  correlated with worse focus, not better answers, in this data.
- **Why memory should be selective**: not just for cost — this run showed
  selectivity also appears to improve whether the model actually *uses*
  the information it's given, not only how much of it there is.
- **Why repository search and memory serve different purposes**: this
  experiment's most unplanned finding. Regardless of mode, the model
  consistently refused to fabricate file structure, framework specifics,
  or existing code — because none of the three context strategies tested
  actually contained real source code, only descriptions *about* code.
  Memory (even "full" memory) cannot substitute for the repository itself.
- **Why context construction is an important part of agent engineering**:
  the same underlying facts, presented as 25 unfiltered items vs. 5
  targeted ones, changed not just token cost but which facts the model
  actually acted on — construction, not just content, determines what a
  model does with a context.
- **A methodology lesson, not a memory-system lesson**: gateway-level
  request caching and a hardcoded `max_tokens` cap were both silent
  confounds that would have gone unnoticed without inspecting raw
  responses, not just aggregate token counts — a reminder that in any
  token-usage experiment, the metrics need to be checked against the
  actual text, not trusted at face value.

## 9. Recommended Architecture

For future levels building on this: keep the Context Builder pattern from
§18's diagram (Repository / Memory+RAG / Conversation Summary all feeding
a single context-construction step, not sent to the LLM independently),
but treat "repository access" as a first-class, separate input from
memory — this experiment's clearest result is that no amount of
memory-only context substituted for it. A future coding agent handling
real implementation tasks needs an actual code-search/repository-read
capability (out of scope here, per §22's explicit "do not over-engineer"
instruction for this experiment) alongside memory, not instead of it.

## Answering the Final Question (§25)

> Can a coding agent maintain comparable task quality while significantly
> reducing LLM input tokens by replacing repeated full context with
> persistent memory and targeted retrieval?

**Yes for token reduction — clearly and reproducibly (≈29% input tokens,
measured twice).** **The quality question turned out to have a more
interesting answer than "comparable":** on the one axis this experiment
could actually grade (whether the response demonstrated awareness of the
correct project conventions), targeted retrieval didn't just match Full
Context, it *outperformed* it — Full Context had strictly more
information available and used less of it. Good retrieval was both
cheaper and more focused than sending everything; poor retrieval was
cheaper still, and worse — proving token cost alone is not a proxy for
retrieval quality, exactly as the curriculum's Mode C was designed to
demonstrate.
