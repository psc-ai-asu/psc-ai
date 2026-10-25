import path from "node:path";
import protobuf from "protobufjs";

// Vendored from open-telemetry/opentelemetry-proto v1.11.1 (see proto/README.md).
const PROTO_DIR = path.join(process.cwd(), "lib/otel/proto");
const REQUEST_PROTO = "opentelemetry/proto/collector/trace/v1/trace_service.proto";
const REQUEST_TYPE = "opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest";

let requestTypePromise;

// Parses the .proto files once per server process.
function getRequestType() {
  if (!requestTypePromise) {
    const root = new protobuf.Root();
    root.resolvePath = (_origin, target) => path.join(PROTO_DIR, target);
    requestTypePromise = root.load(REQUEST_PROTO).then((loaded) => loaded.lookupType(REQUEST_TYPE));
  }
  return requestTypePromise;
}

function toHex(bytes) {
  return bytes?.length ? Buffer.from(bytes).toString("hex") : null;
}

// fixed64 nanosecond timestamps don't fit in a JS number, so they become BigInts.
function toBigInt(long) {
  return long == null ? null : BigInt(long.toString());
}

// AnyValue is a oneof; protobufjs names the field that was set in `value.value`.
// (Unset fields read as type defaults, e.g. an empty buffer, so test the name.)
function anyValue(value) {
  switch (value?.value) {
    case "stringValue": return value.stringValue;
    case "boolValue": return value.boolValue;
    case "intValue": return Number(value.intValue.toString());
    case "doubleValue": return value.doubleValue;
    case "bytesValue": return toHex(value.bytesValue);
    case "arrayValue": return value.arrayValue.values.map(anyValue);
    case "kvlistValue": return attributes(value.kvlistValue.values);
    default: return null;
  }
}

function attributes(keyValues = []) {
  return Object.fromEntries(keyValues.map((kv) => [kv.key, anyValue(kv.value)]));
}

/**
 * Decodes an OTLP/HTTP protobuf body into plain objects:
 * [{ resource, scopes: [{ name, version, spans: [...] }] }]
 * with hex IDs, BigInt nanosecond times and attributes as a key → value object.
 */
export async function decodeTraceRequest(body) {
  const RequestType = await getRequestType();
  const request = RequestType.decode(body);

  return request.resourceSpans.map((resourceSpans) => ({
    resource: attributes(resourceSpans.resource?.attributes),
    scopes: resourceSpans.scopeSpans.map((scopeSpans) => ({
      name: scopeSpans.scope?.name ?? "",
      version: scopeSpans.scope?.version ?? "",
      spans: scopeSpans.spans.map((span) => ({
        traceId: toHex(span.traceId),
        spanId: toHex(span.spanId),
        parentSpanId: toHex(span.parentSpanId),
        name: span.name,
        startTimeUnixNano: toBigInt(span.startTimeUnixNano),
        endTimeUnixNano: toBigInt(span.endTimeUnixNano),
        statusCode: span.status?.code ?? 0,
        statusMessage: span.status?.message ?? "",
        attributes: attributes(span.attributes),
      })),
    })),
  }));
}
