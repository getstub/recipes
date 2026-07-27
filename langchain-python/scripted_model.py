"""A scripted chat model, so the reference runs and the tests pass with no
API key and no network.

It makes the same moves a real model makes: search first, then buy from the
results it was shown. Swap it for any real LangChain chat model and nothing
else in the recipe changes.

    from langchain_openai import ChatOpenAI
    model = ChatOpenAI(model="gpt-4o")
"""

from typing import Any, List, Optional

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult


class ScriptedModel(BaseChatModel):
    """Emits a search call, then a buy call, then a closing message.

    pick: "first" buys whatever the ranking put on top, which is what a model
    naturally does. A product id buys that specific item instead, which is how
    the tests show the clean receipt case.
    """

    pick: str = "first"
    turn: int = 0

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools, **kwargs):
        # The agent binds tools to the model. Nothing to do for a script, but
        # the method has to exist and return something invokable.
        return self

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        self.turn += 1

        if self.turn == 1:
            user_text = ""
            for m in messages:
                if m.type == "human":
                    user_text = m.content
            msg = AIMessage(
                content="",
                tool_calls=[{
                    "name": "search_products",
                    "args": {"query": user_text},
                    "id": "call_search_1",
                }],
            )
            return ChatResult(generations=[ChatGeneration(message=msg)])

        if self.turn == 2:
            product_id = self.pick
            if self.pick == "first":
                # read the search results back out of the tool message
                results = None
                for m in reversed(messages):
                    if m.type == "tool":
                        results = m.content
                        break
                product_id = _first_id(results)
            msg = AIMessage(
                content="",
                tool_calls=[{
                    "name": "buy",
                    "args": {"product_id": product_id},
                    "id": "call_buy_1",
                }],
            )
            return ChatResult(generations=[ChatGeneration(message=msg)])

        msg = AIMessage(content="Done. Your receipt link is in the order above.")
        return ChatResult(generations=[ChatGeneration(message=msg)])


def _first_id(tool_content):
    """Pull the first product id out of whatever shape the tool message took."""
    import ast
    import json
    import re

    if tool_content is None:
        return "sku_ace_racer"
    if isinstance(tool_content, list) and tool_content:
        first = tool_content[0]
        if isinstance(first, dict) and "id" in first:
            return first["id"]
    text = str(tool_content)
    for parse in (json.loads, ast.literal_eval):
        try:
            data = parse(text)
            if isinstance(data, list) and data and isinstance(data[0], dict):
                return data[0]["id"]
        except Exception:
            pass
    m = re.search(r"sku_[a-z_]+", text)
    return m.group(0) if m else "sku_ace_racer"
