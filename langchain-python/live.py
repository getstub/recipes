"""Run the same agent against a real model and the live registry.

Needs OPENAI_API_KEY and `pip install langchain-openai`.
Issues a real receipt you can open in a browser.

    python3 live.py "running shoes under 100"
"""
import os, sys

if not os.environ.get("OPENAI_API_KEY"):
    sys.exit("Set OPENAI_API_KEY first. Run `python3 demo.py` for the offline version.")

from langchain_openai import ChatOpenAI
import agent as A

message = " ".join(sys.argv[1:]) or "running shoes under 100"
result = A.run("user_live_1", message, ChatOpenAI(model="gpt-4o", temperature=0))
for m in result["messages"]:
    if getattr(m, "type", "") == "tool" and "check/" in str(m.content):
        print(m.content)
print("\nOpen the receipt link above to see what the agent did not disclose.")
