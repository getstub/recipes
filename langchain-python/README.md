# Stub in a LangChain agent

A shopping agent built with LangChain, with Stub wired in at the line where your ranking picks a winner.

The lesson is the same as the raw tool loop, which is the point. The framework changes nothing about where the receipt belongs. LangChain orchestrates the model and the tool calls. Your tool function still does the ranking, and the ranking is still the only place that knows a placement fee moved a product to the top.

This is a reference and a simulation. No real merchant, no real money.

## Run it

This one needs **Python 3.10 or newer**, because LangChain 1.x does. Check with
`python3 --version`.

```
pip install -r requirements.txt
export STUB_OPERATOR_ID=op_yourname_langchain
python3 demo.py
```

Pick an operator id that is yours. The first run registers it and saves your
keypair to `.stub-keys.json` in this folder, which is gitignored. Every run
after that loads the same identity, which is what you will do in production
with a secrets manager instead of a file.

The receipt it issues is real. It is signed by your key, stored at the
registry, and the link opens in a browser. It counts against the free tier,
which is 1,000 stubs a month.

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

---

## New here?

[Stub](https://getstub.dev) is an allegiance receipt for AI agents. When an agent
acts on someone's behalf, it issues a small signed record of what it did and what
commercial influence applied. The person served checks that record at a neutral
registry rather than on the operator's own servers, so the operator's word is
never what is being trusted.

The most important field is `not_disclosed`. It is where the agent records what it
held back: partner-only searches, paid placement, a commission the user never
saw. An honest agent leaves it empty, and an empty field is itself signed proof
that nothing applied.

Open a real receipt before installing anything:

https://api.getstub.dev/check/72b4baee1719ec34acc5df5c514a12fd2e19b9a6776de4b45706988f765c77d8

**The Python client:** `pip install getstub`

**Closest to this recipe:**

- [`insurance-advice`](../insurance-advice) the same primitive outside commerce
- [`tool-loop`](../tool-loop) the JavaScript version with no framework

- All six recipes: [github.com/getstub/recipes](https://github.com/getstub/recipes)
- Docs and quickstart: [getstub.dev](https://getstub.dev)
- What the badge below means: [getstub.dev/mark](https://getstub.dev/mark)

[![Stub](https://api.getstub.dev/badge/op_recipes.svg)](https://getstub.dev/o/op_recipes)

These recipes are run against the live registry every day. The badge is drawn
from the receipts that run produces, so if it goes quiet, something here broke.
