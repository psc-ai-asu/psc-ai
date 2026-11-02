"""Run in a fresh process. Bind only loopback; never persist Authorization values."""
import argparse
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from google.protobuf.json_format import MessageToDict
from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceRequest

HERE = Path(__file__).resolve().parent


def decode(body, encoding=None):
    if encoding == "gzip":
        body = gzip.decompress(body)
    return MessageToDict(ExportTraceServiceRequest.FromString(body))


def run_agent():
    # Imports happen after the harness has replaced all tracing configuration.
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

    provider = TracerProvider(resource=Resource.create({}))
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    from langchain_core.messages import HumanMessage
    from langsmith import Client, tracing_context
    from agent import build_agent

    client = Client(info={"version": "local-spike"})
    graph = build_agent()
    scenario = os.environ["SPIKE_SCENARIO"]
    history = []
    with tracing_context(client=client):
        for turn, value in enumerate((["2", "3"] if scenario == "multi-turn" else ["-1" if scenario == "failed-tool" else "2"]), 1):
            try:
                result = graph.invoke({"messages": history + [HumanMessage(content=value)]}, config={
                    "metadata": {"rma.session_id": f"synthetic-{scenario}", "turn": turn,
                                 "ls_model_name": "spike-local-model"},
                    "run_name": "spike-agent",
                })
                history = result["messages"]
            except ValueError:
                if scenario != "failed-tool":
                    raise
    # First drain LangChain callbacks, then LangSmith's queue, then OTel's batch queue.
    from langchain_core.tracers.langchain import wait_for_all_tracers
    wait_for_all_tracers()
    client.flush()
    if not provider.force_flush(timeout_millis=10000):
        raise RuntimeError("OTel flush timed out")
    provider.shutdown()


def sanitize_body(body, encoding):
    """Preserve exported fields; replace machine-specific paths in string values."""
    raw = gzip.decompress(body) if encoding == "gzip" else body
    message = ExportTraceServiceRequest.FromString(raw)
    replacements = [(str(HERE.parents[1]), "/workspace"), (sys.prefix, "/venv"), (str(Path.home()), "/home/spike")]

    def visit(item):
        for field, value in item.ListFields():
            if field.message_type:
                for child in value if field.is_repeated else [value]:
                    visit(child)
            elif field.type == field.TYPE_STRING and not field.is_repeated:
                for source, target in replacements:
                    value = value.replace(source, target)
                setattr(item, field.name, value)
    visit(message)
    sanitized = message.SerializeToString()
    return gzip.compress(sanitized, mtime=0) if encoding == "gzip" else sanitized


def capture(output, scenario, compression, batch_size=512, include_token=True):
    output.mkdir(parents=True, exist_ok=True)
    requests = []

    class Receiver(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_POST(self):
            if self.path != "/api/otel/v1/traces":
                self.send_error(404)
                return
            body = self.rfile.read(int(self.headers["Content-Length"]))
            # Allowlist transport headers. Never persist any Authorization value,
            # cookie, API key, or arbitrary user-supplied header.
            headers = {k.lower(): v for k, v in self.headers.items()
                       if k.lower() in {"content-type", "content-encoding", "content-length", "user-agent"}}
            sanitized = sanitize_body(body, headers.get("content-encoding"))
            requests.append({"path": self.path, "headers": headers,
                             "original_body_sha256": hashlib.sha256(body).hexdigest(),
                             "dummy_authorization_valid": self.headers.get("Authorization") == "Bearer dummy-spike-token",
                             "authorization_present": "Authorization" in self.headers,
                             "trace_token_present": "X-RMA-Trace-Token" in self.headers,
                             "dummy_trace_token_valid": self.headers.get("X-RMA-Trace-Token") == "dummy-spike-token",
                             "body_base64": base64.b64encode(sanitized).decode(),
                             "decoded": decode(sanitized, headers.get("content-encoding"))})
            self.send_response(200)
            self.send_header("Content-Type", "application/x-protobuf")
            self.send_header("Content-Length", "0")
            self.end_headers()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Receiver)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    # Exclude inherited credentials and exporter settings, including legacy LANGCHAIN_*.
    env = {k: v for k, v in os.environ.items()
           if not k.startswith(("LANGSMITH_", "LANGCHAIN_", "OTEL_", "OPENAI_", "ANTHROPIC_"))}
    env.update({
        "LANGSMITH_ENDPOINT": f"http://127.0.0.1:{server.server_port}/unused-langsmith-api",
        "LANGSMITH_TRACING": "true", "LANGSMITH_OTEL_ENABLED": "true", "LANGSMITH_OTEL_ONLY": "true",
        "OTEL_EXPORTER_OTLP_ENDPOINT": f"http://127.0.0.1:{server.server_port}/api/otel",
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT": f"http://127.0.0.1:{server.server_port}/api/otel/v1/traces",
        "OTEL_EXPORTER_OTLP_HEADERS": "X-RMA-Trace-Token=dummy-spike-token" if include_token else "",
        "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf", "OTEL_SERVICE_NAME": "rma-local-spike",
        "OTEL_RESOURCE_ATTRIBUTES": "rma.agent_id=00000000-0000-4000-8000-000000000001",
        "OTEL_BSP_SCHEDULE_DELAY": "60000", "OTEL_BSP_MAX_EXPORT_BATCH_SIZE": str(batch_size),
        "OTEL_EXPORTER_OTLP_COMPRESSION": compression, "SPIKE_SCENARIO": scenario,
        "LANGCHAIN_CALLBACKS_BACKGROUND": "false",
    })
    try:
        subprocess.run([sys.executable, str(HERE / "capture.py"), "--child"], env=env, check=True, timeout=60)
    finally:
        server.shutdown()
        server.server_close()
        worker.join()
    if not requests:
        raise RuntimeError("No real HTTP exports captured")
    fixture = {"provenance": "Real LangGraph/LangSmith SDK HTTP export; deterministic local model, synthetic inputs and usage",
               "sanitization": "Header allowlist; Authorization values omitted; machine paths replaced in protobuf strings, then reserialized/recompressed. Header content-length and SHA-256 describe original wire body.",
               "scenario": scenario, "token_attached": include_token, "compression_setting": compression, "batch_size": batch_size, "requests": requests}
    path = output / f"{scenario}{'-small-batches' if batch_size == 4 else ''}{'-gzip' if compression == 'gzip' else ''}.json"
    path.write_text(json.dumps(fixture, indent=2) + "\n")
    print(f"Captured {path.name}: {len(requests)} HTTP request(s)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--child", action="store_true")
    parser.add_argument("--output", type=Path, default=HERE / "fixtures")
    args = parser.parse_args()
    if args.child:
        run_agent()
    else:
        for scenario, compression in [("normal", "none"), ("multi-turn", "none"), ("failed-tool", "none"), ("normal", "gzip")]:
            capture(args.output, scenario, compression)
        capture(args.output, "normal", "none", batch_size=4)
