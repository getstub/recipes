"""Reference integration: Stub outside commerce.

An agent that recommends a life insurance policy. Same primitive as the
shopping recipes, different world, and the stakes make the point better.

Buying the wrong running shoe costs you forty pounds. Buying the wrong life
policy costs you thousands over twenty years, and you will not find out until
it is too late to switch cheaply. This is the case where "whose side was the
agent on" stops being an abstraction.

The structure is identical to the commerce recipes:

  the operator has commercial relationships with some insurers
  the recommendation engine applies those relationships when it ranks
  the customer sees a recommendation and cannot see why it came first
  the receipt is issued at the ranking line, from the operator's code

Humans built fiduciary duty, conflict of interest disclosure, and commission
rules for exactly this situation, over centuries. Software agents arrived at
the same position with none of it.

This is a reference and a simulation. No real insurer, no real advice, no real
policies. Do not use this to make a decision about insurance.
"""

import os

from getstub import Stub, influenced

from policies import PANEL, find

# The standing mandate, declared once. In regulated advice this is the sentence
# a compliance team signs off, not something written per recommendation.
stub = Stub(
    operator="Fairhaven Advice Agent",
    operator_id="op_fairhaven_ref",
    declared={
        "paid_by": "commission from insurers on the panel",
        "conflicts": ["commission", "partner_only", "own_brand"],
    },
    principal_salt=os.environ.get("STUB_SALT", "insurance-reference-salt"),
    registry=os.environ.get("STUB_REGISTRY", "https://api.getstub.dev"),
)


def rank(cover_needed, max_monthly=None):
    """The recommendation engine, with the operator's commercial pressure in it.

    A customer reading the output sees an ordered list. They cannot see that
    commission moved it, because the reasons live here and nowhere else.
    """
    scored = []
    for p in PANEL:
        if p["cover"] < cover_needed:
            continue
        if max_monthly and p["monthly_premium"] > max_monthly:
            continue
        # a genuine signal: cheaper is better for the customer
        score = 100 - p["monthly_premium"]
        # and the operator's own interests, applied silently
        score += (p["commission_pct"] or 0) * 1.5      # commission dominates
        if p["own_group"]:
            score += 8                                  # keep it in the family
        if not p["on_panel"]:
            score -= 25                                 # off panel gets buried
        scored.append((score, p))
    scored.sort(key=lambda s: s[0], reverse=True)
    return [p for _, p in scored]


def disclosures_for(p):
    """Built from the ranking decision, never written by hand.

    The engine already knows what it applied, because it applied it.
    """
    inf = []
    if p["commission_pct"]:
        inf.append(influenced.commission(
            f"{p['commission_pct']}% of the first year premium"))
    if p["on_panel"]:
        inf.append(influenced.partner_only(
            "only insurers on our distribution panel were ranked competitively"))
    if p["own_group"]:
        inf.append(influenced.own_brand(
            f"{p['insurer']} is owned by our parent company"))
    return inf


def recommend(customer_ref, cover_needed, request_text, max_monthly=None):
    """Produce a recommendation and the receipt that goes with it."""
    ranked = rank(cover_needed, max_monthly)
    if not ranked:
        return None, None, []
    top = ranked[0]

    # --- the one call: a receipt for the recommendation, at the recommendation ---
    receipt = stub.issue(
        principal=customer_ref,        # hashed here, never sent raw
        agent="fairhaven-advice",
        requested=request_text,
        done=f"recommended {top['insurer']}, {top['product']}, "
             f"{top['monthly_premium']} {top['currency']} a month",
        value_moved={"amount": top["monthly_premium"], "currency": top["currency"]},
        not_disclosed=disclosures_for(top),   # empty list is proof of none
    )
    return top, receipt, ranked


def cheapest_suitable(cover_needed):
    """What the customer would have found on their own. Used by the demo to
    show the gap between the recommendation and the best available price."""
    eligible = [p for p in PANEL if p["cover"] >= cover_needed]
    return min(eligible, key=lambda p: p["monthly_premium"]) if eligible else None
