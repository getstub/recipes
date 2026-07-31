"""Reference integration: Stub inside a LangChain agent.

The lesson is the same as the raw tool loop, which is the point: the framework
changes nothing about where the receipt belongs. LangChain orchestrates the
model and the tool calls. Your tool function still does the ranking, and the
ranking is still the only place that knows a placement fee moved a product to
the top. So the receipt is issued inside the tool, from your code.

The model never sees the commercial fields. It could not disclose them
honestly even if you asked it to, which is why it is never asked.

This is a reference and a simulation. No real merchant, no real money.
"""

import os

from langchain_core.tools import tool

from getstub import influenced
from identity import get_stub

from catalog import CATALOG, find

# The standing mandate, declared once. Policy level: who pays you, and which
# kinds of conflict exist in your business at all.
# Your identity, loaded from .stub-keys.json or created on the first run.
stub = get_stub(
    operator="LangChain Reference Agent",
    suggestion="op_yourname_langchain",
    declared={
        "paid_by": "placement fees and commission from featured brands",
        "conflicts": ["placement", "commission", "partner_only"],
    },
    salt="langchain-reference-salt",
)

# Who the agent is acting for. In a real app this comes from your session, and
# it is hashed on your side before it ever leaves.
CURRENT_USER = {"id": "user_demo_1", "request": ""}

# Set by the ranking tool so the buy tool can explain the order it produced.
LAST_RANKING = []


def _rank(query, max_price=None):
    """Your ranking, with your commercial pressure applied."""
    scored = []
    for p in CATALOG:
        if not p["in_stock"]:
            continue
        if max_price and p["price"] > max_price:
            continue
        score = 0.0
        words = query.lower().split()[:2]
        if any(w in (p["title"] + " " + p["description"]).lower() for w in words):
            score += 1
        if p["paid_placement"]:
            score += 5             # a placement fee buys rank
        score += (p["commission_pct"] or 0) / 10   # commission nudges rank
        scored.append((score, p))
    scored.sort(key=lambda s: s[0], reverse=True)
    return [p for _, p in scored]


def _disclosures_for(p):
    """Built from the ranking decision, never written by hand."""
    inf = []
    if p["paid_placement"]:
        inf.append(influenced.placement(f"{p['title']} paid for placement"))
    if p["commission_pct"]:
        inf.append(influenced.commission(f"{p['commission_pct']}% on a sale"))
    if p["partner"]:
        inf.append(influenced.partner_only("shown from the partner network"))
    return inf


@tool
def search_products(query: str, max_price: float = None) -> list:
    """Search the catalogue and return ranked results for a shopper."""
    global LAST_RANKING
    LAST_RANKING = _rank(query, max_price)
    # What the model gets back: no commercial fields. Only real product data.
    return [
        {
            "id": p["id"], "title": p["title"], "price": p["price"],
            "currency": p["currency"], "description": p["description"],
        }
        for p in LAST_RANKING
    ]


@tool
def buy(product_id: str) -> dict:
    """Buy a product on behalf of the shopper. Returns an order and a receipt."""
    chosen = find(product_id)
    if not chosen:
        return {"ok": False, "error": "unknown product"}

    # --- the one call: a receipt for the action, issued from your code ---
    receipt = stub.issue(
        principal=CURRENT_USER["id"],          # hashed here, never sent raw
        agent="langchain-reference",
        requested=CURRENT_USER["request"] or "purchase via agent",
        done=f"bought {chosen['title']}",
        value_moved={"amount": chosen["price"], "currency": chosen["currency"]},
        not_disclosed=_disclosures_for(chosen),   # empty list is proof of none
    )

    return {
        "ok": True,
        "order": "order_" + chosen["id"],
        "title": chosen["title"],
        "price": chosen["price"],
        "receipt": receipt["url"],
    }


TOOLS = [search_products, buy]

SYSTEM_PROMPT = (
    "You help people buy things. Search the catalogue first, then buy the best "
    "option for the shopper. Always tell them the receipt link at the end so "
    "they can check what happened."
)


def build_agent(model):
    """Wire the tools into a LangChain agent.

    `model` is injected so the tests can drive this with a scripted stand-in
    and no API key, and production can pass a real chat model unchanged.
    """
    from langchain.agents import create_agent
    return create_agent(model, TOOLS, system_prompt=SYSTEM_PROMPT)


def run(user_id, message, model):
    """Run one shopping request end to end."""
    CURRENT_USER["id"] = user_id
    CURRENT_USER["request"] = message
    agent = build_agent(model)
    return agent.invoke({"messages": [{"role": "user", "content": message}]})
