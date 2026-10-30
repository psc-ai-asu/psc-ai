// Translates decoded OTLP spans (see decode.js) into rows for the spans table.
//
// Attribute conventions are read in order: OpenTelemetry's GenAI conventions
// (gen_ai.*) first, then LangSmith's (langsmith.*). Supporting another
// framework means adding its attribute names to the readers below. Every raw
// attribute is kept as well, so a missed mapping can be fixed later.

// Spans that SDKs send about themselves and that duplicate the framework's
// spans, such as the Anthropic SDK's own span for every model call.
const IGNORED_SCOPES = new Set(["com.anthropic.sdk.python"]);

const STATUS_ERROR = 2;

// gen_ai.operation.name values (OpenTelemetry GenAI semantic conventions).
const GEN_AI_KINDS = {
  chat: "llm",
  text_completion: "llm",
  generate_content: "llm",
  execute_tool: "tool",
  invoke_agent: "agent",
  create_agent: "agent",
  chain: "chain",
};

// langsmith.span.kind values; retriever, prompt, parser and embedding become "other".
const LANGSMITH_KINDS = { llm: "llm", tool: "tool", chain: "chain" };

function kindOf(a) {
  return GEN_AI_KINDS[a["gen_ai.operation.name"]] ?? LANGSMITH_KINDS[a["langsmith.span.kind"]] ?? "other";
}

function firstNumber(...values) {
  const found = values.find((value) => typeof value === "number" && Number.isFinite(value));
  return found ?? null;
}

function parseJson(text) {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function tokensOf(a) {
  // LangSmith also reports usage as a JSON string in its metadata.
  const usage = parseJson(a["langsmith.metadata.usage_metadata"]) ?? {};
  return {
    input: firstNumber(a["gen_ai.usage.input_tokens"], a["gen_ai.usage.prompt_tokens"], usage.input_tokens),
    output: firstNumber(a["gen_ai.usage.output_tokens"], a["gen_ai.usage.completion_tokens"], usage.output_tokens),
  };
}

function modelOf(a) {
  return a["gen_ai.request.model"] ?? a["gen_ai.response.model"] ?? a["langsmith.metadata.ls_model_name"] ?? null;
}

/**
 * Whether a tool call succeeded. Tools often report failure in their result
 * rather than by raising, so the span status alone isn't enough: a result
 * with an "error" key or "ok": false is a failure. An answer like
 * "met": false is the tool working correctly, so it counts as a success.
 */
export function toolSucceeded(span) {
  if (span.statusCode === STATUS_ERROR) return false;

  // LangChain sends the tool's ToolMessage: {"output": {"content": "<result>", "status": ...}}.
  const output = parseJson(span.attributes["gen_ai.completion"])?.output;
  if (output?.status === "error") return false;

  const result = typeof output?.content === "string" ? parseJson(output.content) : output?.content;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    if ("error" in result || result.ok === false) return false;
  }
  return true;
}

// LangGraph wraps each step in a chain span named after its graph node
// ("model", "tools"); the llm and tool spans sit inside them.
function isWrapper(span, kind) {
  const node = span.attributes["langsmith.metadata.langgraph_node"];
  return kind === "chain" && Boolean(span.parentSpanId) && node != null && span.name === node;
}

// Nanosecond BigInt → ISO timestamp with the microseconds Postgres keeps.
export function nanosToTimestamp(nanos) {
  const seconds = nanos / 1_000_000_000n;
  const micros = (nanos % 1_000_000_000n) / 1_000n;
  const iso = new Date(Number(seconds) * 1000).toISOString();
  return `${iso.slice(0, 19)}.${String(micros).padStart(6, "0")}Z`;
}

/**
 * One decoded span → the fields the ingest route stores.
 * traceId and sessionKey say where it belongs; the rest are spans columns,
 * plus the raw attributes for span_attributes.
 */
export function normalizeSpan(span) {
  const a = span.attributes;
  const kind = kindOf(a);
  const tokens = kind === "llm" ? tokensOf(a) : { input: null, output: null };

  return {
    traceId: span.traceId,
    // A run without a LangGraph thread is its own session.
    sessionKey: a["langsmith.metadata.thread_id"] ?? span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    name: span.name,
    kind,
    isWrapper: isWrapper(span, kind),
    statusCode: span.statusCode,
    statusMessage: span.statusMessage || null,
    startTime: nanosToTimestamp(span.startTimeUnixNano),
    endTime: nanosToTimestamp(span.endTimeUnixNano),
    model: kind === "llm" ? modelOf(a) : null,
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    toolName: kind === "tool" ? (a["gen_ai.tool.name"] ?? span.name) : null,
    toolOk: kind === "tool" ? toolSucceeded(span) : null,
    attributes: a,
  };
}

/** Every span in a decoded export request, normalized, minus ignored scopes. */
export function normalizeTraceRequest(resources) {
  return resources.flatMap((resource) =>
    resource.scopes
      .filter((scope) => !IGNORED_SCOPES.has(scope.name))
      .flatMap((scope) => scope.spans.map(normalizeSpan))
  );
}
