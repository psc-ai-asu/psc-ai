import { gunzipSync } from "node:zlib";
import { createClient } from "@/lib/supabase/server";
import { decodeTraceRequest } from "@/lib/otel/decode";
import { printTraceRequest } from "@/lib/otel/print-trace";

// OTLP/HTTP trace ingest. For now it checks a single dev token from the
// environment and prints what arrives; storing traces comes later.
export const runtime = "nodejs";

const MAX_BODY_BYTES = 5 * 1024 * 1024;

// OTLP exporters treat 4xx (except 429) as permanent and don't retry them.
function reject(status, message) {
  console.warn(`[otel] rejected ${status}: ${message}`);
  return new Response(message, { status, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request) {
  const devToken = process.env.RMA_DEV_TRACE_TOKEN;
  if (!devToken) {
    return reject(503, "Trace ingest is not configured: set RMA_DEV_TRACE_TOKEN.");
  }
  if (request.headers.get("x-rma-token") !== devToken) {
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
  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent) {
    return reject(400, `No agent with id ${agentId}.`);
  }

  printTraceRequest({ agent, resources, bodyBytes: body.length });

  // An empty ExportTraceServiceResponse is a zero-length protobuf body.
  return new Response(new Uint8Array(0), {
    status: 200,
    headers: { "Content-Type": "application/x-protobuf" },
  });
}
