// Turns stored spans into what the review page and agent profile show: the
// span tree, and readable text for a span from its raw attributes.
//
// Spans use the field names normalize.js gives them (spanId, parentSpanId,
// isWrapper, startTime, ...). Message formats are LangChain's, as sent through
// LangSmith's OpenTelemetry export; supporting another framework means adding
// its shapes to the readers below.

function parseJson(text) {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// JSON text indented for reading; anything else unchanged.
function pretty(value) {
  const parsed = typeof value === "string" ? parseJson(value) : value;
  if (parsed === null || typeof parsed !== "object") return typeof value === "string" ? value : JSON.stringify(value);
  return JSON.stringify(parsed, null, 2);
}

// A message's fields, whether plain ({"content": ...}) or LangChain's
// serialized form ({"lc": 1, "kwargs": {"content": ...}}).
function fieldsOf(message) {
  return message?.kwargs ?? message ?? {};
}

// Text parts only: thinking blocks and tool_use parts are left out (tool
// calls are read from tool_calls instead).
function textOf(content) {
  const text = Array.isArray(content)
    ? content.filter((part) => part?.type === "text").map((part) => part.text).join("\n")
    : content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

/**
 * The user's message for a run, from its root span's gen_ai.prompt (JSON
 * text: {"messages": [{"role": "user", "content": ...}]}), or null. Content
 * may be a string or a list of parts; only text parts are kept.
 */
export function userPromptOf(promptJson) {
  const messages = parseJson(promptJson)?.messages;
  if (!Array.isArray(messages)) return null;

  const content = messages.findLast((m) => m?.role === "user" || m?.type === "human")?.content;
  const text = Array.isArray(content)
    ? content.filter((part) => part?.type === "text").map((part) => part.text).join(" ")
    : content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

/** One trace_run_summaries row → the run fields pages show. */
export function toRun(row) {
  return {
    id: row.trace_id,
    prompt: userPromptOf(row.root_prompt),
    startedAt: row.started_at,
    finished: row.root_received,
    durationMs: new Date(row.ended_at) - new Date(row.started_at),
    tokens: row.tokens,
    modelCalls: row.model_calls,
    toolCalls: row.tool_calls,
    failedToolCalls: row.failed_tool_calls,
  };
}

/** A session's runs (from toRun, in start order) and their totals. */
export function summarizeSession(runs) {
  const total = (key) => runs.reduce((sum, run) => sum + run[key], 0);
  return {
    runs,
    startedAt: runs[0]?.startedAt ?? null,
    durationMs: total("durationMs"),
    tokens: total("tokens"),
    modelCalls: total("modelCalls"),
    toolCalls: total("toolCalls"),
    failedToolCalls: total("failedToolCalls"),
  };
}

// The last message sent to a model: the user's question or the tool result it's answering.
function modelInputOf(attributes) {
  // A chat model's prompt is {"messages": [[...one conversation...]]}.
  const messages = parseJson(attributes["gen_ai.prompt"])?.messages?.[0];
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const last = fieldsOf(messages.at(-1));
  if (last.type === "tool") return `Result of ${last.name ?? "a tool"}:\n${pretty(last.content)}`;
  return textOf(last.content);
}

// What a model answered: its text, then one line per tool it called.
function modelOutputOf(attributes) {
  const message = fieldsOf(parseJson(attributes["gen_ai.completion"])?.generations?.[0]?.[0]?.message);
  const calls = (message.tool_calls ?? []).map((call) => `→ ${call.name}(${JSON.stringify(call.args ?? {})})`);
  const parts = [textOf(message.content), ...calls].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

/**
 * Readable input and output for one span, given its raw attributes, labeled
 * for the span details panel. Either text may be null.
 */
export function spanText(span, attributes) {
  if (!span.parentSpanId) {
    const messages = parseJson(attributes["gen_ai.completion"])?.messages ?? [];
    const answer = messages.findLast((m) => fieldsOf(m).type === "ai");
    return {
      inputLabel: "User message",
      input: userPromptOf(attributes["gen_ai.prompt"]),
      outputLabel: "Final answer",
      output: textOf(fieldsOf(answer).content),
    };
  }
  if (span.kind === "llm") {
    return { inputLabel: "Last message in", input: modelInputOf(attributes), outputLabel: "Response", output: modelOutputOf(attributes) };
  }
  if (span.kind === "tool") {
    // LangChain sends the tool's ToolMessage: {"output": {"content": "<result>", ...}}.
    const output = parseJson(attributes["gen_ai.completion"])?.output;
    const result = output && typeof output === "object" ? output.content : output;
    return {
      inputLabel: "Arguments",
      input: attributes["gen_ai.prompt"] == null ? null : pretty(attributes["gen_ai.prompt"]),
      outputLabel: "Result",
      output: result == null ? null : pretty(result),
    };
  }
  return { inputLabel: "Input", input: null, outputLabel: "Output", output: null };
}

/**
 * Spans in display order (depth first, siblings by start time), each with its
 * depth. LangGraph's wrapper spans are left out and their children move up to
 * the wrapper's parent. A span whose parent never arrived is shown at the top.
 */
export function buildSpanTree(spans) {
  const byId = new Map(spans.map((span) => [span.spanId, span]));

  // The nearest ancestor that isn't a wrapper, or null at the top.
  const shownParentOf = (span) => {
    let parent = byId.get(span.parentSpanId);
    while (parent?.isWrapper) parent = byId.get(parent.parentSpanId);
    return parent ?? null;
  };

  const children = new Map();
  const tops = [];
  for (const span of spans) {
    if (span.isWrapper) continue;
    const parent = shownParentOf(span);
    if (!parent) tops.push(span);
    else children.set(parent.spanId, [...(children.get(parent.spanId) ?? []), span]);
  }

  const byStart = (a, b) => new Date(a.startTime) - new Date(b.startTime) || a.startTime.localeCompare(b.startTime);
  const rows = [];
  const visit = (span, depth) => {
    rows.push({ span, depth });
    for (const child of (children.get(span.spanId) ?? []).sort(byStart)) visit(child, depth + 1);
  };
  for (const span of tops.sort(byStart)) visit(span, 0);
  return rows;
}
