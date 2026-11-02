"""Decode the saved real HTTP bodies, not just the convenience JSON view."""
import base64
import json
from pathlib import Path
import unittest
import tempfile

from capture import capture, decode

HERE = Path(__file__).resolve().parent


def attributes(items):
    return {item["key"]: next(iter(item["value"].values())) for item in items}


def spans(request):
    return [span for resource in request["resourceSpans"]
            for scope in resource["scopeSpans"] for span in scope["spans"]]


class CapturedExports(unittest.TestCase):
    def test_live_exports_with_and_without_ownership_header(self):
        for attached in [True, False]:
            with self.subTest(token_attached=attached), tempfile.TemporaryDirectory() as output:
                capture(Path(output), "normal", "none", include_token=attached)
                fixture = json.loads((Path(output) / "normal.json").read_text())
                self.assertEqual(sum(len(spans(request["decoded"])) for request in fixture["requests"]), 9)
                for request in fixture["requests"]:
                    self.assertEqual(request["trace_token_present"], attached)
                    self.assertEqual(request["dummy_trace_token_valid"], attached)
                    self.assertFalse(request["authorization_present"])
                    self.assertNotIn("dummy-spike-token", json.dumps(request))

    def test_all_real_bodies_decode_and_match_inspection_json(self):
        fixtures = sorted((HERE / "fixtures").glob("*.json"))
        self.assertEqual(len(fixtures), 5)
        for path in fixtures:
            with self.subTest(fixture=path.name):
                fixture = json.loads(path.read_text())
                all_spans = []
                for request in fixture["requests"]:
                    headers = request["headers"]
                    self.assertEqual(headers["content-type"], "application/x-protobuf")
                    self.assertNotIn("authorization", headers)
                    if "token_attached" in fixture:
                        self.assertNotIn("x-rma-trace-token", headers)
                        self.assertEqual(request["trace_token_present"], fixture["token_attached"])
                        self.assertEqual(request["dummy_trace_token_valid"], fixture["token_attached"])
                        self.assertFalse(request["authorization_present"])
                    else:  # Original captures used a dummy bearer header.
                        self.assertTrue(request["authorization_present"])
                        self.assertTrue(request["dummy_authorization_valid"])
                    self.assertEqual(headers.get("content-encoding", "none"), fixture["compression_setting"])
                    body = base64.b64decode(request["body_base64"], validate=True)
                    decoded = decode(body, headers.get("content-encoding"))
                    self.assertEqual(decoded, request["decoded"])
                    serialized = json.dumps(decoded)
                    for forbidden in ["dummy-spike-token", "Authorization", "/Users/", "psc-trace-spike-venv"]:
                        self.assertNotIn(forbidden, serialized)
                    for resource in decoded["resourceSpans"]:
                        attrs = attributes(resource["resource"]["attributes"])
                        self.assertEqual(attrs["rma.agent_id"], "00000000-0000-4000-8000-000000000001")
                    all_spans.extend(spans(decoded))
                self.assertEqual(len(all_spans), 18 if fixture["scenario"] == "multi-turn" else 6 if fixture["scenario"] == "failed-tool" else 9)
                by_id = {span["spanId"]: span for span in all_spans}
                roots = [span for span in all_spans if not span.get("parentSpanId")]
                self.assertEqual(len(roots), 2 if fixture["scenario"] == "multi-turn" else 1)
                self.assertEqual(len({span["traceId"] for span in all_spans}), len(roots))
                for span in all_spans:
                    # Protobuf IDs are base64 in MessageToDict; byte widths stay intact.
                    self.assertEqual(len(base64.b64decode(span["traceId"])), 16)
                    self.assertEqual(len(base64.b64decode(span["spanId"])), 8)
                    self.assertLessEqual(int(span["startTimeUnixNano"]), int(span["endTimeUnixNano"]))
                    if span.get("parentSpanId"):
                        parent = by_id[span["parentSpanId"]]
                        self.assertEqual(parent["traceId"], span["traceId"])
                    attrs = attributes(span["attributes"])
                    self.assertEqual(attrs["langsmith.metadata.rma.session_id"], f"synthetic-{fixture['scenario']}")
                    if attrs["langsmith.span.kind"] == "llm":
                        self.assertEqual(attrs["gen_ai.request.model"], "spike-local-model")
                        self.assertEqual(int(attrs["gen_ai.usage.input_tokens"]), 12)
                        self.assertEqual(int(attrs["gen_ai.usage.output_tokens"]), 4)
                    if attrs["langsmith.span.kind"] == "tool":
                        self.assertEqual(span["name"], "local_double")
                        self.assertEqual(attrs["gen_ai.operation.name"], "execute_tool")
                        self.assertNotIn("gen_ai.tool.name", attrs)
                        if fixture["scenario"] == "failed-tool":
                            self.assertEqual(span["status"]["code"], "STATUS_CODE_ERROR")
                            event = next(event for event in span["events"] if event["name"] == "exception")
                            error = attributes(event["attributes"])
                            self.assertIn("synthetic tool failure", error["exception.message"])
                            self.assertIn("exception.type", error)
                            self.assertIn("exception.stacktrace", error)
                if fixture["batch_size"] == 4:
                    self.assertEqual([len(spans(request["decoded"])) for request in fixture["requests"]], [4, 4, 1])
                else:
                    self.assertEqual(len(fixture["requests"]), 1)
                if fixture["scenario"] == "multi-turn":
                    self.assertEqual({attributes(span["attributes"])["langsmith.metadata.turn"] for span in roots}, {"1", "2"})


if __name__ == "__main__":
    unittest.main()
