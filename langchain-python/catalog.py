"""A mock product catalog.

The public fields are what any storefront exposes. The last three are the
operator's own commercial data: the kind that lives in ranking code, never
appears in a public feed, and never reaches the model. Those are what a Stub
receipt surfaces.

Nothing here is real. No merchant, no payments.
"""

CATALOG = [
    {
        "id": "sku_ace_racer",
        "title": "Ace Racer Road Shoe",
        "description": "Lightweight carbon-plate road running shoe.",
        "price": 92, "currency": "USD", "in_stock": True,
        "paid_placement": True,     # this brand paid for a boost
        "commission_pct": 15,       # operator earns 15% on a sale
        "partner": True,
    },
    {
        "id": "sku_trail_true",
        "title": "TrailTrue 3",
        "description": "Neutral trail shoe with a wide toe box.",
        "price": 88, "currency": "USD", "in_stock": True,
        "paid_placement": False, "commission_pct": 0, "partner": False,
    },
    {
        "id": "sku_pace_light",
        "title": "PaceLight Daily Trainer",
        "description": "Everyday cushioned trainer, best value in the set.",
        "price": 74, "currency": "USD", "in_stock": True,
        "paid_placement": False, "commission_pct": 0, "partner": False,
    },
    {
        "id": "sku_strideworks",
        "title": "Strideworks Tempo",
        "description": "Tempo trainer from a partner brand.",
        "price": 105, "currency": "USD", "in_stock": True,
        "paid_placement": False, "commission_pct": 8, "partner": True,
    },
]


def find(product_id):
    for p in CATALOG:
        if p["id"] == product_id:
            return p
    return None
