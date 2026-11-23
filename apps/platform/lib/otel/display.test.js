import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { decodeTraceRequest } from "./decode.js";
import { normalizeTraceRequest } from "./normalize.js";
import { buildSpanTree, spanText, userPromptOf } from "./display.js";

const FIXTURES = path.join(import.meta.dirname, "__fixtures__");

// Every request of one recorded session, decoded and normalized, in arrival order.
async function loadCase(name) {
  const dir = path.join(FIXTURES, name);
  const files = readdirSync(dir).filter((f) => f.endsWith(".pb")).sort();
  const requests = await Promise.all(files.map((f) => decodeTraceRequest(readFileSync(path.join(dir, f)))));
  return requests.flatMap(normalizeTraceRequest);
}

const textOfSpan = (span) => spanText(span, span.attributes);

describe("buildSpanTree", () => {
  it("folds LangGraph's wrapper spans into a run with its model and tool calls", async () => {
    const rows = buildSpanTree(await loadCase("single-run"));
    assert.deepEqual(
      rows.map(({ span, depth }) => [depth, span.kind, span.name]),
      [[0, "chain", "course-planner"], [1, "llm", "ChatAnthropic"], [1, "tool", "search_catalog"], [1, "llm", "ChatAnthropic"]]
    );
  });

  it("gives every run of a session its own tree, in start order", async () => {
    const spans = await loadCase("multi-turn");
    const rows = buildSpanTree(spans);
    const tops = rows.filter((row) => row.depth === 0).map((row) => row.span);
    assert.equal(tops.length, 2);
    assert.ok(tops[0].startTime < tops[1].startTime);
    assert.equal(rows.length, spans.filter((s) => !s.isWrapper).length);
  });

  it("shows a span whose parent hasn't arrived at the top", () => {
    const orphan = { spanId: "b", parentSpanId: "missing", isWrapper: false, startTime: "2026-10-30T00:00:00.000000Z" };
    assert.deepEqual(buildSpanTree([orphan]), [{ span: orphan, depth: 0 }]);
  });
});

describe("spanText", () => {
  it("shows a run's user message and final answer", async () => {
    const root = (await loadCase("single-run")).find((s) => !s.parentSpanId);
    const text = textOfSpan(root);
    assert.equal(text.input, "Is CS 336 available next semester?");
    assert.match(text.output, /^Yes, CS 336/);
  });

  it("shows what a model was sent and the tools it called", async () => {
    const [first, second] = (await loadCase("single-run")).filter((s) => s.kind === "llm").sort((a, b) => a.startTime.localeCompare(b.startTime));
    assert.equal(textOfSpan(first).input, "Is CS 336 available next semester?");
    assert.equal(textOfSpan(first).output, '→ search_catalog({"query":"CS 336"})');
    assert.match(textOfSpan(second).input, /^Result of search_catalog:\n\{/);
    assert.match(textOfSpan(second).output, /^Yes, CS 336/);
  });

  it("shows a tool's arguments and result as indented JSON", async () => {
    const failed = (await loadCase("failed-tools")).filter((s) => s.kind === "tool" && s.toolOk === false);
    assert.equal(failed.length, 2);
    for (const span of failed) {
      const text = textOfSpan(span);
      assert.match(text.input, /^\{\n {2}"/);
      assert.match(text.output, /"error"|"ok": false/);
    }
  });

  it("returns nulls when the text isn't there", () => {
    const text = spanText({ parentSpanId: "a", kind: "tool" }, {});
    assert.equal(text.input, null);
    assert.equal(text.output, null);
  });
});

describe("userPromptOf", () => {
  const prompt = (messages) => JSON.stringify({ messages });

  it("reads the last user message", () => {
    assert.equal(userPromptOf(prompt([{ role: "user", content: "Is CS 336 available?" }])), "Is CS 336 available?");
    assert.equal(userPromptOf(prompt([{ role: "user", content: "first" }, { role: "assistant", content: "ok" }, { role: "user", content: " second " }])), "second");
  });

  it("joins text parts and skips the rest", () => {
    const content = [{ type: "image", url: "x" }, { type: "text", text: "Plan my" }, { type: "text", text: "semester" }];
    assert.equal(userPromptOf(prompt([{ role: "user", content }])), "Plan my semester");
  });

  it("returns null when there is no user text", () => {
    for (const input of [undefined, null, "not json", "{}", prompt([]), prompt([{ role: "assistant", content: "hi" }]), prompt([{ role: "user", content: "  " }])]) {
      assert.equal(userPromptOf(input), null);
    }
  });

  it("finds the prompt on every fixture run", async () => {
    for (const name of ["single-run", "multi-turn", "failed-tools"]) {
      for (const root of (await loadCase(name)).filter((s) => !s.parentSpanId)) {
        assert.ok(userPromptOf(root.attributes["gen_ai.prompt"]), `${name}: root span has the user's prompt`);
      }
    }
  });
});
