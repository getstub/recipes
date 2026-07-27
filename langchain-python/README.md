# Stub in a LangChain agent

A shopping agent built with LangChain, with Stub wired in at the line where your ranking picks a winner.

The lesson is the same as the raw tool loop, which is the point. The framework changes nothing about where the receipt belongs. LangChain orchestrates the model and the tool calls. Your tool function still does the ranking, and the ranking is still the only place that knows a placement fee moved a product to the top.

This is a reference and a simulation. No real merchant, no real money.

## Run it

```
pip install -r requirements.txt
python3 test_recipe.py   # 20 tests, offline, no API key
python3 demo.py          # watch the agent run and read the receipt
```

Against a real model and the live registry:

```
pip install langchain-openai
export OPENAI_API_KEY=sk-...
python3 live.py "running shoes under 100"
```

That issues a real receipt you can open in a browser.

## The one call

Inside your tool, where you already know what was chosen:

```python
from getstub import Stub, influenced

stub = Stub(
    operator="Your Agent",
    declared={
        "paid_by": "placement fees and commission from featured brands",
        "conflicts": ["placement", "commission"],
    },
    principal_salt=os.environ["STUB_SALT"],
)

@tool
def buy(product_id: str) -> dict:
    chosen = find(product_id)

    inf = []
    if chosen["paid_placement"]:
        inf.append(influenced.placement(f"{chosen['title']} paid for placement"))
    if chosen["commission_pct"]:
        inf.append(influenced.commission(f"{chosen['commission_pct']}% on a sale"))

    receipt = stub.issue(
        principal=current_user.id,     # hashed on your side, never sent raw
        agent="your-agent",
        requested=current_user.request,
        done=f"bought {chosen['title']}",
        value_moved={"amount": chosen["price"], "currency": chosen["currency"]},
        not_disclosed=inf,             # empty list is signed proof none applied
    )
    return {"ok": True, "order": "...", "receipt": receipt["url"]}
```

Return the receipt url in the tool result and the agent will pass it on to the shopper.

## Why the model never decides disclosures

Your ranking code applied the boost, so your ranking code is the only thing that knows it happened. A model asked to disclose commercial influence would be guessing about its operator's business, and a guessed disclosure is worse than none because it looks like evidence.

So the commercial fields never enter the tool result. The model sees titles, prices, and descriptions. Your code sees the rest, and signs for it.

## Files

- `agent.py` the tools, the ranking, and the one Stub call
- `catalog.py` a mock catalogue carrying commercial flags the model never sees
- `scripted_model.py` a stand-in chat model so tests run with no API key
- `local_registry.py` runs the real registry logic locally so everything verifies offline
- `test_recipe.py` 20 tests
- `demo.py` and `live.py` runners

## What the tests prove

Worth running rather than reading. Among the 20:

- the agent actually calls both tools through LangChain
- commercial fields appear in no tool result the model receives
- the paid item ranked first, and the receipt records exactly the three influences that applied
- the raw user id appears nowhere in the record, only a digest
- the signature verifies, which means the Python client signed correctly against the real registry
- an uninfluenced purchase yields a clean receipt with the declared conflicts still on record

Copyright Stub 2026
