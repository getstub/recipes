# Stub outside commerce: insurance advice

An agent that recommends a life insurance policy, with Stub wired in at the line where the recommendation engine picks a winner.

Same primitive as the shopping recipes. Different world, and higher stakes.

This is a reference and a simulation. No real insurer, no real policies, no real advice. Do not use it to make a decision about insurance.

## Why this one exists

The commerce recipes prove Stub works where money changes hands fast. This one proves the primitive is not about shopping.

Buying the wrong running shoe costs you forty pounds. Buying the wrong life policy costs you a thousand or more across twenty years, and you find out too late to switch cheaply. Delegated advice under commercial influence is the case humans built fiduciary duty, conflict of interest disclosure, and commission rules for, over centuries. Software agents arrived at the same position with none of it.

## Run it

```
pip install -r requirements.txt
export STUB_OPERATOR_ID=op_yourname_fairhaven
python3 demo.py
```

Pick an operator id that is yours. The first run registers it and saves your
keypair to `.stub-keys.json` in this folder, which is gitignored. Every run
after that loads the same identity, which is what you will do in production
with a secrets manager instead of a file.

The receipt it issues is real. It is signed by your key, stored at the
registry, and the link opens in a browser. It counts against the free tier,
which is 1,000 stubs a month.

## What the demo shows

```
  1. Northwind Mutual      34.10/mo   22% commission, on panel
  2. Meridian Life         36.50/mo   15% commission, on panel, same parent company
  3. Castlegate            31.95/mo   8% commission, on panel
  4. Harbour Assurance     29.80/mo   off panel

Recommended: Northwind Mutual at 34.10 a month
Cheapest suitable: Harbour Assurance at 29.80 a month
Difference over the twenty year term: 1,032 GBP
```

The cheapest suitable policy is ranked last, because it pays the operator nothing. The recommendation is not false. It is a real policy with real cover from a real insurer. It is just not the cheapest, and until now there was no way for the customer to see why it came first.

The receipt says:

```
commission: 22% of the first year premium
partner_only: only insurers on our distribution panel were ranked competitively
```

## The one call

```python
from getstub import Stub, influenced

stub = Stub(
    operator="Your Advice Agent",
    declared={
        "paid_by": "commission from insurers on the panel",
        "conflicts": ["commission", "partner_only", "own_brand"],
    },
    principal_salt=os.environ["STUB_SALT"],
)

# at the line where your engine picks a winner:
inf = []
if top["commission_pct"]:
    inf.append(influenced.commission(f"{top['commission_pct']}% of the first year premium"))
if top["on_panel"]:
    inf.append(influenced.partner_only("only panel insurers were ranked competitively"))
if top["own_group"]:
    inf.append(influenced.own_brand(f"{top['insurer']} is owned by our parent company"))

receipt = stub.issue(
    principal=customer_ref,        # hashed on your side, never sent raw
    agent="your-advice-agent",
    requested=request_text,
    done=f"recommended {top['insurer']}, {top['monthly_premium']} a month",
    value_moved={"amount": top["monthly_premium"], "currency": top["currency"]},
    not_disclosed=inf,             # empty list is signed proof none applied
)
```

## A note on the standing mandate

In regulated advice the mandate is the natural fit for something a compliance team already produces. "We are paid commission by insurers on our panel" is a sentence that gets signed off once, not written per recommendation. What applied to a specific recommendation travels on the receipt, and the engine fills that in because the engine is what applied it.

## Files

- `agent.py` the recommendation engine and the one Stub call
- `policies.py` a mock panel carrying commission rates and panel membership
- `demo.py` the runner

## What the tests prove

- the recommended policy pays commission and is not the cheapest suitable one
- the off panel insurer is ranked last
- the customer pays about a thousand pounds more over the term
- the receipt records the commission, the panel restriction, and own brand when it applies
- the customer reference is stored as a digest and no personal identifiers reach the record
- the signature verifies and every disclosed kind was covered by the standing mandate
- a zero commission, off panel policy produces no disclosures at all

Copyright Stub 2026

---

## New here?

[Stub](https://getstub.dev) is an allegiance receipt for AI agents. When an agent
acts on someone's behalf, it issues a small signed record of what it did and what
commercial influence applied. The person served checks that record at a neutral
registry rather than on the operator's own servers, so the operator's word is
never what is being trusted.

The load-bearing field is `not_disclosed`. It is where the agent records what it
held back: partner-only searches, paid placement, a commission the user never
saw. An honest agent leaves it empty, and an empty field is itself signed proof
that nothing applied.

Open a real receipt before installing anything:

https://api.getstub.dev/check/72b4baee1719ec34acc5df5c514a12fd2e19b9a6776de4b45706988f765c77d8

**The Python client:** `pip install getstub`

**Closest to this recipe:**

- [`langchain-python`](../langchain-python) the commerce version in the same language
- [`tool-loop`](../tool-loop) the smallest version of all

- All six recipes: [github.com/getstub/recipes](https://github.com/getstub/recipes)
- Docs and quickstart: [getstub.dev](https://getstub.dev)
- What the badge below means: [getstub.dev/mark](https://getstub.dev/mark)

[![Stub](https://api.getstub.dev/badge/op_recipes.svg)](https://getstub.dev/o/op_recipes)

These recipes are run against the live registry every day. The badge is drawn
from the receipts that run produces, so if it goes quiet, something here broke.
