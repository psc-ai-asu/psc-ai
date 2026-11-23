# OpenTelemetry protocol definitions

Copied unchanged from [open-telemetry/opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto) at tag `v1.11.1` (Apache License 2.0). Only the files needed to decode an OTLP trace export are included:

- `opentelemetry/proto/collector/trace/v1/trace_service.proto`
- `opentelemetry/proto/trace/v1/trace.proto`
- `opentelemetry/proto/common/v1/common.proto`
- `opentelemetry/proto/resource/v1/resource.proto`

`lib/otel/decode.js` loads them with `protobufjs` at runtime. To update, replace the files with the same paths from a newer tag.
