# OTLP trace fixtures

Real request bodies the ingest route received from the Course Planner demo agent (`examples/course-planner`) on Oct 29, 2026, with Claude Haiku 5.5 (multi-turn and failed-tools re-recorded the same evening after the search tool changed). Each `.pb` file is one `ExportTraceServiceRequest` exactly as it arrived (protobuf, uncompressed), numbered in arrival order. Decode one with `decodeTraceRequest()` from `lib/otel/decode.js`.

They are for translation-layer tests, for replaying a session into the route without calling the model, and for the demo fallback.

| Case | Prompts | Requests | What it covers |
| --- | --- | --- | --- |
| `single-run/` | "Is CS 336 available next semester?" | 1 (7 spans) | The simplest case: one whole run, root span included, in a single request |
| `multi-turn/` | "Plan my spring semester: I need CS 336 and two electives, nothing before 10am." then "Swap one of the electives for an AI course." | 3 (16 + 11 + 3 spans) | Two runs (traces) in one session, sharing one `thread_id`, with no failed tool calls. Request 1 has run 1's spans without their root; request 2 mixes both traces (the end of run 1, with its root span, and the start of run 2) |
| `failed-tools/` | "Build me a schedule with exactly these sections: CS336-02, MATH263-01, MATH452-01, and CS 999." | 3 (20 + 8 + 3 spans) | One run with two failed tool calls: an unknown course (`check_prerequisites` for `CS 999` returns `error`) and a time conflict (`CS336-02` and `MATH263-01`, so `build_schedule` returns `ok: false`). Two "no" answers that count as successes: missing prerequisites for `MATH 452` (`met: false`) and no catalog matches for `CS 999` (`message`). Only request 3 has the root span |

Things the tests should expect:

- Every span's status is OK (code 1), including the failed tool calls. The tools return results instead of raising, so a failure shows only in the tool span's `gen_ai.completion`, which is JSON shaped like `{"output": {"content": "<the tool's result as a JSON string>", ...}}`. A result with an `error` key or `ok: false` is a failure; `met: false` and a `message` saying nothing matched are answers, not failures.
- `langsmith.metadata.thread_id` is on every span and is the session key. Each trace id is one run.
- The `model` and `tools` spans are LangGraph node wrappers (`langsmith.metadata.langgraph_node`); the `llm` and `tool` spans sit under them.
- Only `llm` spans carry `gen_ai.request.model` and `gen_ai.usage.*` tokens; only `tool` spans carry `gen_ai.tool.name`.

To record new ones, set `RMA_TRACE_CAPTURE_DIR` when starting the platform (`RMA_TRACE_CAPTURE_DIR=/some/dir npm run dev`) and run the agent; `lib/otel/capture.js` saves each accepted body there. Check new captures for API keys, hostnames or local paths before committing them.
