"""A mock panel of insurance policies.

The public fields are what any comparison service shows. The last three are
the operator's own commercial data: commission rates, panel membership, and
whether the insurer is owned by the same group. That data lives in the
recommendation engine, never reaches the customer, and is exactly what a
Stub receipt surfaces.

Nothing here is real. No insurer, no policies, no advice.
"""

PANEL = [
    {
        "id": "pol_northwind_life",
        "insurer": "Northwind Mutual",
        "product": "Level term life, 20 years",
        "monthly_premium": 34.10,
        "cover": 250000,
        "currency": "GBP",
        # operator-side commercial signals:
        "commission_pct": 22,      # the operator earns 22% of first year premium
        "on_panel": True,          # inside the operator's distribution agreement
        "own_group": False,
    },
    {
        "id": "pol_harbour_life",
        "insurer": "Harbour Assurance",
        "product": "Level term life, 20 years",
        "monthly_premium": 29.80,
        "cover": 250000,
        "currency": "GBP",
        "commission_pct": 0,
        "on_panel": False,         # cheaper, but pays the operator nothing
        "own_group": False,
    },
    {
        "id": "pol_meridian_own",
        "insurer": "Meridian Life",
        "product": "Level term life, 20 years",
        "monthly_premium": 36.50,
        "cover": 250000,
        "currency": "GBP",
        "commission_pct": 15,
        "on_panel": True,
        "own_group": True,         # same parent company as the operator
    },
    {
        "id": "pol_castle_life",
        "insurer": "Castlegate",
        "product": "Level term life, 20 years",
        "monthly_premium": 31.95,
        "cover": 250000,
        "currency": "GBP",
        "commission_pct": 8,
        "on_panel": True,
        "own_group": False,
    },
]


def find(policy_id):
    for p in PANEL:
        if p["id"] == policy_id:
            return p
    return None
