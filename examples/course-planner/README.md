# Course Planner demo agent

A small Python LangGraph agent that plans a one-semester class schedule. It exists to produce real execution traces for ReviewMyAgent: every model and tool call becomes an OpenTelemetry span sent to the platform's OTLP endpoint.

The agent has three tools, all reading local JSON in `data/`:

| Tool | What it does |
| --- | --- |
| `search_catalog` | Finds sections by code, keyword or tag, with optional earliest start time and days |
| `check_prerequisites` | Checks a course against the student's completed courses |
| `build_schedule` | Builds a weekly schedule, or reports time conflicts and the 18-credit limit |

Only the model call uses the network. The course data is made up for the demo.

## Setup

You need Python 3.10+ and a Claude API key from the [Claude Console](https://platform.claude.com). The agent uses Claude Haiku 5.5 by default; set `ANTHROPIC_MODEL` to use another Claude model.

```bash
cd examples/course-planner
python3 -m venv .venv            # or: uv venv
source .venv/bin/activate
pip install -r requirements.txt  # or: uv pip install -r requirements.txt
cp .env.example .env             # then fill in ANTHROPIC_API_KEY
```

## Run

Start the platform first (`supabase start` and `npm run dev` in `apps/platform`), then:

```bash
python agent.py                  # chat; press Enter on an empty line to finish
python agent.py "Plan my spring semester: I need CSE 340 and two electives, nothing before 10am." \
                "Add CSE 434 too."   # scripted, one run per message
```

The platform's terminal prints each batch of spans it receives. The agent prints the session's model calls, token counts and an estimated cost at list prices; the Console's Usage page shows the exact charge.

## How tracing works

The agent has no tracing code; `.env` configures everything:

| Variable | Purpose |
| --- | --- |
| `LANGSMITH_TRACING`, `LANGSMITH_OTEL_ENABLED`, `LANGSMITH_OTEL_ONLY` | Make LangChain emit OpenTelemetry spans instead of sending to LangSmith, so no LangSmith account is needed |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | The platform's ingest route |
| `OTEL_EXPORTER_OTLP_HEADERS` | `x-rma-token` (your trace token) and `x-rma-agent-id` (the agent's id on the platform) |
| `ANTHROPIC_OPEN_TELEMETRY=false` | Stops the Anthropic SDK sending its own duplicate span for every model call |

Each chat is one LangGraph thread, so every span carries `langsmith.metadata.thread_id` and the platform can group a conversation's runs. LangSmith flushes the remaining spans when the script exits.

What arrives (protobuf, no compression, roughly one request every 5 seconds while spans finish):

```
scope langsmith
  - course-planner [chain]                 one root span per message
    - model [chain]
      - ChatAnthropic [llm]                gen_ai.request.model, gen_ai.usage.input_tokens / output_tokens
    - tools [chain]
      - search_catalog [tool]              gen_ai.tool.name, gen_ai.prompt (args), gen_ai.completion (result)
    ...
```

## Tests

```bash
python -m pytest tests           # tool tests; no API key needed
```
