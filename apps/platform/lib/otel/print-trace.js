// Temporary: prints decoded OTLP traces to the server console so the
// agent → ingest route workflow can be checked before anything is stored.

function describeSpan(span) {
  const a = span.attributes;
  const ms = Number((span.endTimeUnixNano - span.startTimeUnixNano) / 1_000_000n);
  const parts = [`${span.name} [${a["langsmith.span.kind"] ?? "span"}] ${ms} ms`];

  if (a["gen_ai.request.model"]) parts.push(a["gen_ai.request.model"]);
  if (a["gen_ai.usage.input_tokens"] != null) {
    parts.push(`${a["gen_ai.usage.input_tokens"]}/${a["gen_ai.usage.output_tokens"]} tokens`);
  }
  if (span.statusCode === 2) parts.push(`ERROR ${span.statusMessage}`);
  return parts.join(" · ");
}

function printTree(spans) {
  const ids = new Set(spans.map((s) => s.spanId));
  const children = new Map();

  for (const span of spans) {
    // A parent can arrive in a later request, so treat those spans as roots here.
    const parent = span.parentSpanId && ids.has(span.parentSpanId) ? span.parentSpanId : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(span);
  }

  const walk = (parent, depth) => {
    const sorted = (children.get(parent) ?? []).sort((a, b) => (a.startTimeUnixNano < b.startTimeUnixNano ? -1 : 1));
    for (const span of sorted) {
      const orphan = depth === 0 && span.parentSpanId ? " (parent in another request)" : "";
      console.log(`[otel]   ${"  ".repeat(depth)}- ${describeSpan(span)}${orphan}`);
      walk(span.spanId, depth + 1);
    }
  };
  walk(null, 0);
}

export function printTraceRequest({ agent, resources, bodyBytes }) {
  const scopes = resources.flatMap((r) => r.scopes);
  const spans = scopes.flatMap((s) => s.spans);
  const traceIds = [...new Set(spans.map((s) => s.traceId))];
  const threadId = spans.find((s) => s.attributes["langsmith.metadata.thread_id"])?.attributes["langsmith.metadata.thread_id"];

  console.log(
    `[otel] ${agent.name} (${agent.id}) · ${bodyBytes} bytes · ${spans.length} spans · ` +
      `${traceIds.length} trace${traceIds.length === 1 ? "" : "s"}${threadId ? ` · thread ${threadId}` : ""}`
  );
  for (const scope of scopes) {
    console.log(`[otel]   scope ${scope.name || "(unnamed)"}: ${scope.spans.length} spans`);
  }
  for (const traceId of traceIds) {
    console.log(`[otel]   trace ${traceId}`);
    printTree(spans.filter((s) => s.traceId === traceId));
  }
}
