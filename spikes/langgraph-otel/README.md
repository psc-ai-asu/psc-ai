# LangGraph OTLP capture spike

This isolated research utility runs a minimal LangGraph tool-calling agent with one local tool (`local_double`) and a deterministic `BaseChatModel`. It is not application ingestion code. No model, LangSmith, Supabase, or platform credentials are required or read. The tool fails on negative integers.

**Evidence boundary:** the five fixtures are real HTTP requests emitted by the installed LangChain/LangGraph → LangSmith → OTel SDK pipeline. Inputs, model responses, model name, and usage counts are deliberately synthetic. They verify serialization of those fields, not real provider usage accounting. No provider-backed LLM call was performed. Do not describe these as provider-backed traces or fabricated OTLP payloads: the SDK generated the spans from actual local graph/tool executions.

## Reproduce

Tested with Python 3.14.2 on macOS; every installed Python dependency is pinned in `requirements.txt`, including LangGraph 1.0.5, langgraph-prebuilt 1.0.5, langchain-core 1.2.7, LangSmith 0.6.2, and OpenTelemetry 1.45.1. The explicit prebuilt pin matters: newer 1.0.10 resolved successfully but imported a LangGraph runtime symbol absent from 1.0.5. Other Python versions/platforms have not been verified.

From the repository root:

```bash
python3 -m venv spikes/langgraph-otel/.venv
spikes/langgraph-otel/.venv/bin/pip install -r spikes/langgraph-otel/requirements.txt
spikes/langgraph-otel/.venv/bin/pip check
# Optional: use a temporary directory to compare new captures with committed fixtures.
spikes/langgraph-otel/.venv/bin/python spikes/langgraph-otel/capture.py --output /tmp/rma-new-captures
spikes/langgraph-otel/.venv/bin/python -m unittest discover -s spikes/langgraph-otel -p 'test_*.py' -v
```

Without `--output`, the harness replaces its five fixture files with captures using the dedicated attribution header. IDs, timestamps, service instance IDs, and compression sizes vary between runs. Capture requires permission to bind an ephemeral `127.0.0.1` port. The receiver accepts only `/api/otel/v1/traces`, returns a successful empty protobuf response, and shuts down after each scenario. Each child process has a 60-second limit. Each receiver exists only during that local run.

The harness strips inherited `LANGSMITH_*`, `LANGCHAIN_*`, `OTEL_*`, and model-key settings, then supplies its own optional fixed dummy attribution token and loopback endpoints. It supplies local SDK server-info data and also redirects any LangSmith API fallback to loopback; no LangSmith cloud API is needed. Do not adapt this capture receiver to accept real user data or credentials.

Only allowlisted transport headers are persisted. The X-RMA-Trace-Token header is checked against the fixed dummy value in memory; only booleans recording its presence and validity are saved. The original five fixtures used a dummy Authorization header and are retained as historical captures. No Authorization value, cookie, arbitrary header, or real credential is written. Bodies contain only synthetic tasks. Machine-specific workspace, home, and virtualenv paths are replaced in protobuf string fields, then the message is reserialized and, for gzip, recompressed. This is the only payload sanitization; no model, usage, metadata, status, event, timing, ID, or hierarchy fields are invented by the capture utility.

Each fixture contains sanitized protobuf bytes (`body_base64`), their decoded convenience view, original allowlisted headers, and the original wire body's SHA-256. **Content-Length and SHA-256 describe the original wire body, not the sanitized bytes**. JSON views use protobuf's `MessageToDict`, whose byte IDs are base64 and whose 64-bit integers are decimal strings. The on-wire content type is not JSON. Decode ID bytes to hex only in a future translation layer; retain nanoseconds as integer/string values, not JavaScript numbers.

## Verified configuration

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_OTEL_ENABLED=true
export LANGSMITH_OTEL_ONLY=true
export OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318/api/otel"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://127.0.0.1:4318/api/otel/v1/traces"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_COMPRESSION="none"
export OTEL_EXPORTER_OTLP_HEADERS="X-RMA-Trace-Token=dummy-spike-token"
export OTEL_RESOURCE_ATTRIBUTES="rma.agent_id=00000000-0000-4000-8000-000000000001"
```

The harness substitutes its actual ephemeral port for 4318. The general endpoint is a **base** URL; the HTTP exporter appends `/v1/traces`. The per-signal endpoint is the full path and takes precedence. The receiver verifies that the dedicated attribution header arrives. The live test also omits it and verifies that all nine spans still arrive. This also prevents LangSmith's default API-key/project headers from being selected.

Before importing/creating LangChain components, explicitly register this provider:

```python
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

provider = TracerProvider(resource=Resource.create({}))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
```

LangSmith 0.6.2's built-in provider constructs `Resource(...)` directly, so relying on it to read `OTEL_RESOURCE_ATTRIBUTES` loses `rma.agent_id`. `Resource.create({})` reads the environment and the registered provider is reused by LangSmith. The fixture checks require this resource attribute. The HTTP/protobuf exporter is selected explicitly by its Python class; setting the protocol variable alone does not change the pinned LangSmith exporter's class.

Pass a shared reviewer interaction/session key on **every** graph invocation:

```python
result = graph.invoke(inputs, config={"metadata": {"rma.session_id": session_key}})
```

After all calls, drain queues in order before exiting:

```python
from langchain_core.tracers.langchain import wait_for_all_tracers
# client is the same langsmith.Client passed to tracing_context(client=client)
wait_for_all_tracers()
client.flush()
if not provider.force_flush(timeout_millis=10000):
    raise RuntimeError("OTel flush timed out")
provider.shutdown()
```

`client.flush()` drains LangSmith work; it does not replace OTel's force-flush. The harness uses synchronous LangChain callbacks to reduce scheduling variation, but still explicitly drains them. Do not flush/shut down while graph calls or background callbacks are still in flight. Normal fixtures use a 60-second OTel scheduled delay and flush at exit; the final small-batch fixture also triggers size-based export at four spans.

The token page linked from the developer dashboard’s agent details contains only basic token management. Technical configuration is documented here. **The production `/api/otel/v1/traces` endpoint is not implemented in this work.** A personal token only maps a run to its user UUID, like reviewed_by on a review. Send it in X-RMA-Trace-Token; without it the traces still arrive with unknown ownership. It is not an ingestion access key. See [the ownership contract](../../docs/personal-trace-tokens.md#ownership-contract).

## Observed export mapping

These observations come from the decoded bodies, not the documentation's table of attributes accepted by LangSmith ingestion. That table includes conventions which this exporter did not emit.

| Meaning | Observed location / behavior |
| --- | --- |
| Content type | `application/x-protobuf` in all requests; bodies decode as `ExportTraceServiceRequest` |
| Compression | With `none`, no Content-Encoding; explicit `gzip` produces `Content-Encoding: gzip` and gzip wire bytes; both decode to the same field structure. OTLP JSON and other compression modes were not tested. |
| Span category | `langsmith.span.kind`: `chain`, `llm`, `tool`; model has `gen_ai.operation.name=chat`, tool has `execute_tool` |
| Model | `gen_ai.request.model=spike-local-model`, derived from `ls_model_name` metadata. It also appears on chain/tool spans due to inherited metadata: use kind to distinguish model calls. No `gen_ai.response.model` observed. |
| Usage | `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.usage.total_tokens` on model spans; local model supplies synthetic 12/4/16 values |
| Tool identity | Span `name=local_double` and `langsmith.span.kind=tool`; **no `gen_ai.tool.name` attribute observed** |
| Tool failure | Span status `STATUS_CODE_ERROR`; event `exception` with `exception.type`, `exception.message`, `exception.stacktrace`, `exception.escaped`. Exporter wraps the original error as `Exception`; message retains the synthetic ValueError/traceback. Parent tools/root spans also receive errors. |
| LangChain metadata | `langsmith.metadata.<key>`; session key becomes `langsmith.metadata.rma.session_id`; turn becomes `langsmith.metadata.turn` |
| Public agent ID | `resourceSpans[].resource.attributes["rma.agent_id"]`, from `Resource.create` + environment; it is not a bearer identity |
| Session | Shared `langsmith.metadata.rma.session_id` on both multi-turn invocation roots and descendants. Each turn has a different trace ID. `langsmith.trace.session_name` is the SDK project name (`default`), not this reviewer session key. |
| Input/output | `gen_ai.prompt` / `gen_ai.completion` serialized JSON strings; additional model message fields can occur; do not infer privacy from span kind |
| Hierarchy | OTLP `traceId`, `spanId`, `parentSpanId`; children link to parents within the same trace; two roots for the two-turn fixture |
| Batching | Root/child spans share requests. Multiple traces can share one request; one trace can span multiple requests. Arrival/request boundaries are not session completion signals. |

| Fixture | HTTP requests | Spans | Notes |
| --- | ---: | ---: | --- |
| `normal.json` | 1 | 9 | One root, two local model calls, one successful tool |
| `multi-turn.json` | 1 | 18 | Two roots/trace IDs, common session metadata, history passed into turn two |
| `failed-tool.json` | 1 | 6 | Negative input; tool exception aborts graph; root/tool-node errors propagate |
| `normal-gzip.json` | 1 | 9 | Explicit gzip on real exported body |
| `normal-small-batches.json` | 3 | 9 | Maximum export batch size 4; requests contain 4, 4, 1 spans |

Focused checks decode each saved body, compare the convenience JSON, check byte ID widths and nanosecond bounds, resolve parent links across requests, assert model/usage/tool/error fields, confirm session grouping and agent resource attributes, and reject credential/path leakage. The test intentionally fixes the observed shape: update assertions only after investigating changes from dependency upgrades.

## Official compatibility references

Checked October 22, 2026 (America/Phoenix):

- [LangSmith: Trace with OpenTelemetry](https://docs.langchain.com/langsmith/trace-with-opentelemetry): Python integration flags, OTel-only export, alternate endpoint, explicit provider, resource attributes. The docs' supported-attribute table describes ingestion mappings, not a guarantee about export fields.
- [LangSmith provider source](https://github.com/langchain-ai/langsmith-sdk/blob/main/python/langsmith/_internal/otel/_otel_client.py) and [exporter source](https://github.com/langchain-ai/langsmith-sdk/blob/main/python/langsmith/_internal/otel/_otel_exporter.py): the installed 0.6.2 source was inspected for resource construction, HTTP exporter selection, metadata, usage and exception behavior.
- [OpenTelemetry Python exporters](https://opentelemetry.io/docs/languages/python/exporters/): HTTP/protobuf exporter and batch span processor.
- [OpenTelemetry SDK configuration](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/): resource and batch settings.

Unverified: real hosted/local LLM provider credentials, actual provider-reported token usage/model response fields, streaming/async/cancellation, retry and overload behavior, other SDK versions, OTLP JSON, non-gzip compression, and any production ingestion/authentication. These fixtures are sufficient to inspect the pinned local SDK export; provider-backed captures remain a follow-up requiring a provider configuration.
