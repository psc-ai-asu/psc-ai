"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildSpanTree, spanText } from "@/lib/otel/display";
import { formatClock, formatDuration } from "@/lib/format";
import { MetricTile } from "./components";

const SPAN_COLUMNS =
  "id, trace_id, span_id, parent_span_id, name, kind, is_wrapper, status_code, status_message, start_time, end_time, model, input_tokens, output_tokens, tool_name, tool_ok";

// The field names normalize.js uses, which buildSpanTree() and spanText() expect.
function toSpan(row) {
  return {
    id: row.id,
    traceId: row.trace_id,
    spanId: row.span_id,
    parentSpanId: row.parent_span_id,
    name: row.name,
    kind: row.kind,
    isWrapper: row.is_wrapper,
    statusCode: row.status_code,
    statusMessage: row.status_message,
    startTime: row.start_time,
    endTime: row.end_time,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    toolName: row.tool_name,
    toolOk: row.tool_ok,
  };
}

const STATUS_ERROR = 2;
const isFailedTool = (span) => span.kind === "tool" && span.toolOk === false;
const durationOf = (span) => new Date(span.endTime) - new Date(span.startTime);
const count = (n) => n.toLocaleString("en-US");

function colorOf(span) {
  if (!span.parentSpanId) return "bg-stone-600";
  if (isFailedTool(span)) return "bg-amber-400";
  return { llm: "bg-violet-500", tool: "bg-teal-400" }[span.kind] ?? "bg-stone-500";
}

/**
 * One Trace-backed review's session: a tab per run, the run's totals, its span
 * tree on a timeline, and details for the selected span. Spans load when this
 * mounts; a span's text loads when it's selected, and RLS returns it only to
 * the reviewer and the agent's owner. Render with key={session id} so picking
 * another review starts fresh.
 */
export default function TraceView({ session }) {
  const [runIndex, setRunIndex] = useState(0);
  // null while loading.
  const [spans, setSpans] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  // Span id → its raw attributes, or null when this viewer can't read them.
  const [attributesById, setAttributesById] = useState({});

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("spans")
      .select(SPAN_COLUMNS)
      .in("trace_id", session.runs.map((run) => run.id))
      .then(({ data }) => {
        if (!cancelled) setSpans((data ?? []).map(toSpan));
      });
    return () => { cancelled = true; };
  }, [session]);

  const run = session.runs[runIndex];
  const rows = buildSpanTree((spans ?? []).filter((span) => span.traceId === run.id));
  const root = rows[0]?.span;
  const runStart = new Date(root?.startTime ?? run.startedAt);
  const runMs = Math.max(run.durationMs, 1);
  const selected = rows.find((row) => row.span.id === selectedId)?.span ?? root;

  useEffect(() => {
    if (!selected || selected.id in attributesById) return;
    let cancelled = false;
    createClient()
      .from("span_attributes")
      .select("attributes")
      .eq("span_id", selected.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAttributesById((loaded) => ({ ...loaded, [selected.id]: data?.attributes ?? null }));
      });
    return () => { cancelled = true; };
  }, [selected, attributesById]);

  const llms = rows.map((row) => row.span).filter((span) => span.kind === "llm");
  const tokensIn = llms.reduce((sum, span) => sum + (span.inputTokens ?? 0), 0);
  const tokensOut = llms.reduce((sum, span) => sum + (span.outputTokens ?? 0), 0);
  const models = [...new Set(llms.map((span) => span.model).filter(Boolean))].join(", ");

  return (
    <div className="space-y-5">
      {/* Run tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-widest mr-2">
          Session · {session.runs.length} run{session.runs.length === 1 ? "" : "s"}
        </span>
        {session.runs.map((r, i) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={i === runIndex}
            onClick={() => { setRunIndex(i); setSelectedId(null); }}
            title={r.prompt ?? undefined}
            className={`w-[200px] min-h-11 px-3.5 py-2 rounded-lg border text-left flex flex-col gap-0.5 transition-colors ${
              i === runIndex ? "border-violet-500 bg-violet-500/10" : "border-stone-700/50 bg-stone-900 hover:border-stone-600"
            }`}
          >
            <span className={`text-xs font-medium ${i === runIndex ? "text-stone-100" : "text-stone-300"}`}>
              Run {i + 1} <span className="font-mono font-normal text-stone-500">· {formatDuration(r.durationMs)}</span>
            </span>
            <span className={`text-xs truncate ${r.prompt ? "text-stone-400" : "text-stone-600 italic"}`}>
              {r.prompt ?? "Prompt hidden"}
            </span>
          </button>
        ))}
      </div>

      {/* Run totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricTile label="Run duration" value={formatDuration(run.durationMs)} sub="agent time" />
        <MetricTile label="Model calls" value={run.modelCalls} sub={models || null} />
        <MetricTile
          label="Tool calls"
          value={run.toolCalls}
          sub={run.failedToolCalls ? `${run.failedToolCalls} returned errors` : run.toolCalls ? "all OK" : null}
          highlight={run.failedToolCalls > 0}
        />
        <MetricTile label="Tokens" value={count(run.tokens)} sub={spans ? `${count(tokensIn)} in · ${count(tokensOut)} out` : null} />
      </div>

      <div className="flex flex-wrap gap-5 items-start">
        {/* Span tree */}
        <section aria-label="Span tree" className="flex-[999_1_600px] min-w-0 border border-stone-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[240px_56px_64px_96px_1fr] gap-3 items-center px-3 py-2 bg-stone-900 border-b border-stone-800 text-[11px] font-medium uppercase tracking-wider text-stone-500">
                <span>Span</span>
                <span>Kind</span>
                <span className="text-right">Time</span>
                <span className="text-right">Tokens in / out</span>
                <span className="flex justify-between normal-case tracking-normal font-mono">
                  <span>0 s</span>
                  <span>{formatDuration(run.durationMs)}</span>
                </span>
              </div>

              {spans === null ? (
                <p className="px-3 py-6 text-xs text-stone-500">Loading spans…</p>
              ) : rows.length === 0 ? (
                <p className="px-3 py-6 text-xs text-stone-500">No spans to show for this run.</p>
              ) : (
                rows.map(({ span, depth }) => {
                  const offset = new Date(span.startTime) - runStart;
                  return (
                    <button
                      key={span.id}
                      type="button"
                      aria-pressed={span.id === selected?.id}
                      onClick={() => setSelectedId(span.id)}
                      className={`w-full grid grid-cols-[240px_56px_64px_96px_1fr] gap-3 items-center px-3 py-1.5 border-b border-stone-800/50 text-left transition-colors ${
                        span.id === selected?.id ? "bg-violet-500/10" : "hover:bg-stone-900"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: `${depth * 16}px` }}>
                        <span className={`w-2 h-2 rounded-sm shrink-0 ${colorOf(span)}`} aria-hidden="true" />
                        <span className="text-xs font-mono text-stone-200 truncate">{span.toolName ?? span.name}</span>
                        {isFailedTool(span) && (
                          <span className="text-[11px] text-amber-400 border border-amber-400/40 rounded px-1 shrink-0">error result</span>
                        )}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">{span.parentSpanId ? span.kind : "run"}</span>
                      <span className="text-xs font-mono text-stone-400 text-right">{formatDuration(durationOf(span))}</span>
                      <span className="text-xs font-mono text-stone-400 text-right">
                        {span.kind === "llm" ? `${count(span.inputTokens ?? 0)} / ${count(span.outputTokens ?? 0)}` : ""}
                      </span>
                      <span className="relative h-2.5 bg-stone-900 rounded-sm block">
                        <span
                          className={`absolute inset-y-0 rounded-sm ${colorOf(span)}`}
                          style={{
                            left: `${Math.min(Math.max(offset / runMs, 0), 1) * 100}%`,
                            width: `${Math.max((durationOf(span) / runMs) * 100, 0.6)}%`,
                          }}
                        />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 px-3 py-2.5 bg-stone-900 text-xs text-stone-400">
            {[["bg-stone-600", "run"], ["bg-violet-500", "model call"], ["bg-teal-400", "tool call"], ["bg-amber-400", "tool returned an error"]].map(([color, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${color}`} aria-hidden="true" />
                {label}
              </span>
            ))}
            <span className="ml-auto text-stone-500">LangGraph&apos;s model / tools wrapper spans are folded away</span>
          </div>
        </section>

        {selected && (
          <SpanDetails
            span={selected}
            offsetMs={new Date(selected.startTime) - runStart}
            attributes={attributesById[selected.id]}
          />
        )}
      </div>
    </div>
  );
}

// `attributes` is undefined while loading and null when this viewer can't read the span's text.
function SpanDetails({ span, offsetMs, attributes }) {
  const failed = isFailedTool(span);
  const errored = span.statusCode === STATUS_ERROR;
  const text = attributes ? spanText(span, attributes) : null;

  const facts = [
    ["Kind", span.parentSpanId ? span.kind : "agent run"],
    // The run's own span starts the run, so only the spans inside it get an offset.
    ["Started at", span.parentSpanId ? `${formatClock(span.startTime)} · +${formatDuration(Math.max(offsetMs, 0))}` : formatClock(span.startTime)],
    ["Duration", formatDuration(durationOf(span))],
    span.kind === "llm" && ["Model", span.model ?? "unknown"],
    span.kind === "llm" && ["Tokens in / out", `${count(span.inputTokens ?? 0)} / ${count(span.outputTokens ?? 0)}`],
    span.kind === "tool" && ["Tool", span.toolName],
  ].filter(Boolean);

  return (
    <aside aria-label="Span details" className="flex-[1_1_300px] min-w-0 border border-stone-800 rounded-lg bg-stone-900 p-4 space-y-3.5">
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-1">Selected span</p>
        <p className="text-[15px] font-mono text-stone-100 break-all">{span.toolName ?? span.name}</p>
      </div>

      <dl className="grid grid-cols-[104px_1fr] gap-x-3 gap-y-1.5 text-xs">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-stone-500">{label}</dt>
            <dd className="font-mono text-stone-200">{value}</dd>
          </div>
        ))}
        <dt className="text-stone-500">Status</dt>
        <dd className={failed ? "text-amber-400" : errored ? "text-rose-400" : "text-teal-400"}>
          {failed ? "Returned an error result" : errored ? `Error${span.statusMessage ? `: ${span.statusMessage}` : ""}` : "OK"}
        </dd>
      </dl>

      {attributes === undefined ? (
        <p className="text-xs text-stone-500">Loading text…</p>
      ) : attributes === null ? (
        <div className="p-3.5 border border-dashed border-stone-700 rounded-md flex gap-2.5 items-start">
          <span className="text-stone-400" aria-hidden="true">🔒</span>
          <p className="text-xs text-stone-400 leading-relaxed">
            Prompts, tool inputs and outputs can contain private text, so only the reviewer and the agent owner see them. Structure, timings and token counts are public.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {[[text.inputLabel, text.input], [text.outputLabel, text.output]].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-1.5">{label}</p>
              <pre className="max-h-72 overflow-auto p-2.5 bg-stone-950 border border-stone-800 rounded-md font-mono text-xs text-stone-300 whitespace-pre-wrap break-words">
                {value ?? "Not recorded"}
              </pre>
            </div>
          ))}
          <p className="text-xs text-stone-500 flex gap-1.5 items-center">
            <span aria-hidden="true">🔒</span>
            Inputs and outputs are visible to the reviewer and the agent owner only.
          </p>
        </div>
      )}
    </aside>
  );
}
