"""Course Planner: a LangGraph agent that plans a semester.

Interactive:   python agent.py
Scripted:      python agent.py "Plan my spring semester..." "Add CSE 434 too."

The agent has no tracing code. The variables in .env turn on LangSmith's
OpenTelemetry export and point it at ReviewMyAgent, which receives every model
and tool call as a span. Each chat is one LangGraph thread, so its runs share
a thread_id that the platform uses to group them.
"""

import argparse
import os
import sys
import uuid

from dotenv import load_dotenv

# Load .env before anything reads the LANGSMITH_*, OTEL_* or ANTHROPIC_* variables.
load_dotenv()

from langchain.agents import create_agent  # noqa: E402
from langchain_anthropic import ChatAnthropic  # noqa: E402
from langchain_core.messages import AIMessage  # noqa: E402
from langgraph.checkpoint.memory import InMemorySaver  # noqa: E402

from tools import TOOLS, load_student  # noqa: E402

DEFAULT_MODEL = "claude-haiku-5-5"

# List prices in USD per million tokens (input, output), for the cost estimate
# printed at the end of a session. Haiku's price applies to prompts up to 100K
# tokens, far above what this agent sends.
PRICES = {
    "claude-haiku-5-5": (0.10, 0.50),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-opus-5-5": (4.00, 20.00),
}

SYSTEM_PROMPT = f"""You are a course planning assistant for {load_student()["name"]}, a computer science student.
Build a one-semester schedule that satisfies the student's request.

Rules:
- Use search_catalog to find sections; never invent courses, section IDs or times.
- Call check_prerequisites for every course before adding it. If a prerequisite is missing,
  say which one and suggest an alternative course instead.
- Call build_schedule with your chosen section IDs. If it reports conflicts, pick different
  sections and call it again until it succeeds.
- In your final answer, list each class with its code, title, section ID, days, times and
  credits, then the total credits. Keep explanations short."""


def build_agent(model_name):
    # No temperature: the Claude API rejects sampling parameters.
    model = ChatAnthropic(model=model_name, max_tokens=16000)
    return create_agent(
        model,
        tools=TOOLS,
        system_prompt=SYSTEM_PROMPT,
        checkpointer=InMemorySaver(),
        name="course-planner",
    )


def ask(agent, thread_id, text):
    # The thread keeps follow-ups in one conversation; its id is exported on
    # every span as langsmith.metadata.thread_id.
    result = agent.invoke(
        {"messages": [{"role": "user", "content": text}]},
        config={"configurable": {"thread_id": thread_id}},
    )
    return result["messages"][-1].text


def session_usage(agent, thread_id):
    """Sum token usage over every model call in the thread."""
    messages = agent.get_state({"configurable": {"thread_id": thread_id}}).values.get("messages", [])
    usage = [m.usage_metadata for m in messages if isinstance(m, AIMessage) and m.usage_metadata]
    return len(usage), sum(u["input_tokens"] for u in usage), sum(u["output_tokens"] for u in usage)


def print_cost(model_name, calls, input_tokens, output_tokens):
    line = f"{calls} model calls, {input_tokens:,} input / {output_tokens:,} output tokens"
    if model_name in PRICES:
        input_price, output_price = PRICES[model_name]
        cost = (input_tokens * input_price + output_tokens * output_price) / 1_000_000
        line += f", about ${cost:.4f} at {model_name} list prices"
    print(line)


def prompts_from_terminal():
    print("Course Planner — ask about your semester. Press Enter on an empty line to finish.\n")
    while True:
        try:
            text = input("you> ").strip()
        except EOFError:
            return
        if not text or text.lower() in {"exit", "quit"}:
            return
        yield text


def main():
    parser = argparse.ArgumentParser(description="Plan a semester with the Course Planner agent.")
    parser.add_argument("prompts", nargs="*", help="run these messages in order instead of chatting")
    args = parser.parse_args()

    model_name = os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)
    agent = build_agent(model_name)
    thread_id = str(uuid.uuid4())
    runs = 0

    try:
        for text in args.prompts or prompts_from_terminal():
            if args.prompts:
                print(f"you> {text}")
            try:
                print(f"\nplanner> {ask(agent, thread_id, text)}\n")
                runs += 1
            except Exception as error:  # e.g. an overloaded API; keep the session going
                print(f"\nplanner> (error: {error})\n", file=sys.stderr)
    except KeyboardInterrupt:
        print()

    if runs:
        print(f"Session {thread_id}: {runs} run{'s' if runs != 1 else ''}.")
        print_cost(model_name, *session_usage(agent, thread_id))


if __name__ == "__main__":
    main()
