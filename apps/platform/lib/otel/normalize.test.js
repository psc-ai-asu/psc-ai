import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { decodeTraceRequest } from "./decode.js";
import { nanosToTimestamp, normalizeSpan, normalizeTraceRequest, toolSucceeded } from "./normalize.js";

const FIXTURES = path.join(import.meta.dirname, "__fixtures__");

// Every request of one recorded session, decoded and normalized, in arrival order.
async function loadCase(name) {
  const dir = path.join(FIXTURES, name);
  const files = readdirSync(dir).filter((f) => f.endsWith(".pb")).sort();
  const requests = await Promise.all(files.map((f) => decodeTraceRequest(readFileSync(path.join(dir, f)))));
  return requests.flatMap(normalizeTraceRequest);
}

const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);

// What the agent printed at the end of each recorded session (from LangChain's
// own usage tracking, not from the spans).
const CASES = {
  "single-run": { runs: 1, modelCalls: 2, inputTokens: 2546, outputTokens: 177 },
  "multi-turn": { runs: 2, modelCalls: 6, inputTokens: 16408, outputTokens: 1814 },
  "failed-tools": { runs: 1, modelCalls: 5, inputTokens: 12545, outputTokens: 1577 },
};

for (const [name, expected] of Object.entries(CASES)) {
  describe(`fixture ${name}`, async () => {
    const spans = await loadCase(name);
    const llm = spans.filter((s) => s.kind === "llm");

    it("puts every span in one session", () => {
      assert.equal(new Set(spans.map((s) => s.sessionKey)).size, 1);
      assert.match(spans[0].sessionKey, /^[0-9a-f-]{36}$/);
    });

    it("has one trace and one root span per run", () => {
      assert.equal(new Set(spans.map((s) => s.traceId)).size, expected.runs);
      const roots = spans.filter((s) => !s.parentSpanId);
      assert.equal(roots.length, expected.runs);
      for (const root of roots) {
        assert.equal(root.name, "course-planner");
        assert.equal(root.isWrapper, false);
      }
    });

    it("matches the agent's own count of model calls and tokens", () => {
      assert.equal(llm.length, expected.modelCalls);
      assert.equal(sum(llm, "inputTokens"), expected.inputTokens);
      assert.equal(sum(llm, "outputTokens"), expected.outputTokens);
      for (const span of llm) assert.equal(span.model, "claude-haiku-5-5");
    });

    it("maps every span to a known kind and every tool span to its tool", () => {
      for (const span of spans) assert.notEqual(span.kind, "other", span.name);
      for (const span of spans.filter((s) => s.kind === "tool")) {
        assert.ok(["search_catalog", "check_prerequisites", "build_schedule"].includes(span.toolName));
        assert.equal(typeof span.toolOk, "boolean");
      }
      for (const span of spans.filter((s) => s.kind !== "tool")) {
        assert.equal(span.toolName, null);
        assert.equal(span.toolOk, null);
      }
    });

    it("marks LangGraph's model and tools node spans as wrappers", () => {
      const wrappers = spans.filter((s) => s.isWrapper);
      assert.ok(wrappers.length > 0);
      for (const span of wrappers) {
        assert.equal(span.kind, "chain");
        assert.ok(["model", "tools"].includes(span.name));
      }
      // Every llm and tool span sits directly inside a wrapper.
      const wrapperIds = new Set(wrappers.map((s) => s.spanId));
      for (const span of spans.filter((s) => s.kind === "llm" || s.kind === "tool")) {
        assert.ok(wrapperIds.has(span.parentSpanId), span.name);
      }
    });

    it("keeps ids as hex and times in order", () => {
      for (const span of spans) {
        assert.match(span.traceId, /^[0-9a-f]{32}$/);
        assert.match(span.spanId, /^[0-9a-f]{16}$/);
        if (span.parentSpanId) assert.match(span.parentSpanId, /^[0-9a-f]{16}$/);
        assert.ok(span.startTime <= span.endTime, span.name);
      }
    });

    it("keeps the raw attributes", () => {
      for (const span of spans) assert.ok(span.attributes["langsmith.span.kind"]);
    });
  });
}

describe("tool failures", () => {
  it("finds the two failures in the failed-tools session, and only those", async () => {
    const failed = (await loadCase("failed-tools")).filter((s) => s.toolOk === false);
    const summary = failed.map((s) => `${s.toolName} ${s.attributes["gen_ai.prompt"]}`).sort();
    assert.deepEqual(summary, [
      'build_schedule {"section_ids":["CS336-02","MATH263-01"]}',
      'check_prerequisites {"course_code":"CS 999"}',
    ]);
  });

  // Answers the model asked for are successes, even when the answer is "no".
  for (const [toolName, prompt, resultText] of [
    ["check_prerequisites", "MATH 452", '\\"met\\": false'],
    ["search_catalog", "CS 999", "No sections match"],
  ]) {
    it(`counts ${toolName} for ${prompt} as a success`, async () => {
      const span = (await loadCase("failed-tools")).find(
        (s) => s.toolName === toolName && s.attributes["gen_ai.prompt"].includes(prompt)
      );
      assert.ok(span.attributes["gen_ai.completion"].includes(resultText));
      assert.equal(span.toolOk, true);
    });
  }

  it("finds no failures in the multi-turn session", async () => {
    assert.equal((await loadCase("multi-turn")).filter((s) => s.toolOk === false).length, 0);
  });

  const toolSpan = (completion, statusCode = 1) => ({ statusCode, attributes: { "gen_ai.completion": completion } });
  const message = (content, extra = {}) => JSON.stringify({ output: { content, ...extra } });

  it("treats an error status or a LangChain error ToolMessage as a failure", () => {
    assert.equal(toolSucceeded(toolSpan(message('{"ok": true}'), 2)), false);
    assert.equal(toolSucceeded(toolSpan(message("Error: boom", { status: "error" }))), false);
  });

  it("reads results returned as objects or JSON strings", () => {
    assert.equal(toolSucceeded(toolSpan(message('{"error": "nope"}'))), false);
    assert.equal(toolSucceeded(toolSpan(message({ ok: false }))), false);
    assert.equal(toolSucceeded(toolSpan(message('{"ok": true, "sections": []}'))), true);
  });

  it("treats plain text or a missing result as a success", () => {
    assert.equal(toolSucceeded(toolSpan(message("42 results"))), true);
    assert.equal(toolSucceeded(toolSpan(message('["error"]'))), true);
    assert.equal(toolSucceeded(toolSpan(undefined)), true);
  });
});

describe("normalizeTraceRequest", () => {
  const span = {
    traceId: "a".repeat(32), spanId: "b".repeat(16), parentSpanId: null, name: "Messages.create",
    startTimeUnixNano: 0n, endTimeUnixNano: 0n, statusCode: 0, statusMessage: "",
    attributes: { "gen_ai.operation.name": "chat", "gen_ai.usage.input_tokens": 10 },
  };

  it("drops the Anthropic SDK's duplicate spans", () => {
    const resources = [{ resource: {}, scopes: [
      { name: "com.anthropic.sdk.python", spans: [span] },
      { name: "langsmith", spans: [span] },
    ] }];
    assert.equal(normalizeTraceRequest(resources).length, 1);
  });

  it("uses the trace id as the session when there is no thread_id", () => {
    assert.equal(normalizeSpan(span).sessionKey, span.traceId);
  });

  it("reads GenAI token counts and older prompt/completion names", () => {
    const older = { ...span, attributes: { "gen_ai.operation.name": "chat", "gen_ai.usage.prompt_tokens": 7, "gen_ai.usage.completion_tokens": 3 } };
    assert.deepEqual([normalizeSpan(span).inputTokens, normalizeSpan(span).outputTokens], [10, null]);
    assert.deepEqual([normalizeSpan(older).inputTokens, normalizeSpan(older).outputTokens], [7, 3]);
  });
});

describe("nanosToTimestamp", () => {
  it("keeps microseconds beyond what a JS Date holds", () => {
    assert.equal(nanosToTimestamp(1793318302180123456n), "2026-10-29T23:58:22.180123Z");
    assert.equal(nanosToTimestamp(0n), "1970-01-01T00:00:00.000000Z");
  });
});
