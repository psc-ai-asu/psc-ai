import { gunzipSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeTraceRequest } from "@/lib/otel/decode";
import { normalizeTraceRequest } from "@/lib/otel/normalize";
import { captureTraceRequest } from "@/lib/otel/capture";

// OTLP/HTTP trace ingest. Decodes an export request, normalizes its spans and
// stores them through ingest_trace_spans() with the service-role key.
export const runtime = "nodejs";

const MAX_BODY_BYTES = 5 * 1024 * 1024;

// OTLP exporters treat 4xx (except 429) as permanent and don't retry them.
function reject(status, message) {
  console.warn(`[otel] rejected ${status}: ${message}`);
  return new Response(message, { status, headers: { "Content-Type": "text/plain" } });
}

/**
 * Which account sent this request, or null. Until personal trace tokens exist
 * there is one dev token, mapped to one account by RMA_DEV_TRACE_USER_ID.
 * This is the only place that decides who sent a trace.
 */
function senderOf(request) {
  const devToken = process.env.RMA_DEV_TRACE_TOKEN;
  if (!devToken || request.headers.get("x-rma-token") !== devToken) return null;
  return process.env.RMA_DEV_TRACE_USER_ID;
}

// normalize.js fields → the keys ingest_trace_spans() reads.
function toRow(span) {
  return {
    otel_trace_id: span.traceId,
    session_key: span.sessionKey,
    span_id: span.spanId,
    parent_span_id: span.parentSpanId,
    name: span.name,
    kind: span.kind,
    is_wrapper: span.isWrapper,
    status_code: span.statusCode,
    status_message: span.statusMessage,
    start_time: span.startTime,
    end_time: span.endTime,
    model: span.model,
    input_tokens: span.inputTokens,
    output_tokens: span.outputTokens,
    tool_name: span.toolName,
    tool_ok: span.toolOk,
    attributes: span.attributes,
  };
}

export async function POST(request) {
  const supabase = createAdminClient();
  if (!process.env.RMA_DEV_TRACE_TOKEN || !process.env.RMA_DEV_TRACE_USER_ID || !supabase) {
    return reject(503, "Trace ingest is not configured: set RMA_DEV_TRACE_TOKEN, RMA_DEV_TRACE_USER_ID and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const submittedBy = senderOf(request);
  if (!submittedBy) {
    return reject(401, "Missing or invalid x-rma-token header.");
  }

  const agentId = request.headers.get("x-rma-agent-id");
  if (!agentId) {
    return reject(400, "Missing x-rma-agent-id header.");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/x-protobuf")) {
    return reject(415, "Only application/x-protobuf is supported.");
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return reject(413, "Request body is too large.");
  }
  let body = Buffer.from(await request.arrayBuffer());
  if (request.headers.get("content-encoding") === "gzip") {
    try {
      body = gunzipSync(body, { maxOutputLength: MAX_BODY_BYTES });
    } catch {
      return reject(400, "Body is not valid gzip, or unpacks to more than the size limit.");
    }
  }
  if (body.length > MAX_BODY_BYTES) {
    return reject(413, "Request body is too large.");
  }

  let resources;
  try {
    resources = await decodeTraceRequest(body);
  } catch (error) {
    return reject(400, `Body is not a valid OTLP trace export: ${error.message}`);
  }

  // A malformed id comes back as an error and an unknown id as null.
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent) {
    return reject(400, `No agent with id ${agentId}.`);
  }

  await captureTraceRequest(body);

  const spans = normalizeTraceRequest(resources);
  if (spans.length > 0) {
    const { data: stored, error } = await supabase.rpc("ingest_trace_spans", {
      p_agent_id: agent.id,
      p_submitted_by: submittedBy,
      p_spans: spans.map(toRow),
    });

    if (error?.code === "42501") {
      return reject(403, error.message);
    }
    if (error) {
      // 5xx, so the exporter retries; every write in ingest_trace_spans() is an upsert.
      console.error(`[otel] storing spans failed: ${error.code} ${error.message}`);
      return new Response("Couldn't store spans. Try again.", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
    console.log(`[otel] ${agent.name}: stored ${stored} spans across ${new Set(spans.map((s) => s.traceId)).size} runs`);
  }

  // An empty ExportTraceServiceResponse is a zero-length protobuf body.
  return new Response(new Uint8Array(0), {
    status: 200,
    headers: { "Content-Type": "application/x-protobuf" },
  });
}
