"""Credential-free LangGraph agent. Model responses/usage are synthetic; export is real."""
from typing import Annotated, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode


@tool
def local_double(value: int) -> int:
    """Double a non-negative integer locally; negative inputs intentionally fail."""
    if value < 0:
        raise ValueError("synthetic tool failure: negative input")
    return value * 2


class LocalModel(BaseChatModel):
    @property
    def _llm_type(self):
        return "spike-local-model"

    @property
    def _identifying_params(self):
        return {"model_name": "spike-local-model"}

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        if isinstance(messages[-1], HumanMessage):
            message = AIMessage(content="", tool_calls=[{
                "name": "local_double", "args": {"value": int(messages[-1].content)},
                "id": "synthetic-call", "type": "tool_call",
            }])
        else:
            message = AIMessage(content=f"Local result: {messages[-1].content}")
        # Deliberate test values, NOT measured provider tokens.
        message.usage_metadata = {"input_tokens": 12, "output_tokens": 4, "total_tokens": 16}
        return ChatResult(generations=[ChatGeneration(message=message)])


class State(TypedDict):
    messages: Annotated[list, add_messages]


def build_agent():
    model = LocalModel()
    builder = StateGraph(State)
    builder.add_node("model", lambda state: {"messages": [model.invoke(state["messages"])]})
    builder.add_node("tools", ToolNode([local_double], handle_tool_errors=False))
    builder.add_edge(START, "model")
    builder.add_conditional_edges("model", lambda state: "tools" if state["messages"][-1].tool_calls else END)
    builder.add_edge("tools", "model")
    return builder.compile()
