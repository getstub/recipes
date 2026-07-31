"""Watch the recommendation happen, then read the receipt it issued.

    export STUB_OPERATOR_ID=op_yourname_fairhaven
    python3 demo.py

No model key needed: the ranking is deterministic. The receipt is real, signed
by your keypair, and it counts against the free tier.
"""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
REGISTRY = os.environ.get("STUB_REGISTRY", "https://api.getstub.dev")

import agent as A

if True:
    top, receipt, ranked = A.recommend(
        customer_ref="customer_demo_1",
        cover_needed=250000,
        request_text="term life cover, 250000, twenty years",
    )

    print("\nWhat the recommendation engine produced:")
    for i, p in enumerate(ranked, 1):
        why = ", ".join(filter(None, [
            f"{p['commission_pct']}% commission" if p["commission_pct"] else "",
            "on panel" if p["on_panel"] else "off panel",
            "same parent company" if p["own_group"] else "",
        ]))
        print(f"  {i}. {p['insurer']:<20} {p['monthly_premium']:>6.2f}/mo   {why}")

    cheapest = A.cheapest_suitable(250000)
    gap = (top["monthly_premium"] - cheapest["monthly_premium"]) * 12 * 20
    print(f"\nRecommended: {top['insurer']} at {top['monthly_premium']:.2f} a month")
    print(f"Cheapest suitable: {cheapest['insurer']} at {cheapest['monthly_premium']:.2f} a month")
    print(f"Difference over the twenty year term: {gap:,.0f} {top['currency']}")

    print(f"\nReceipt: {receipt['url']}")
    sid = receipt["url"].rstrip("/").split("/")[-1]
    # A plain urlopen sends urllib's default user agent, which a lot of edge
    # networks block. Name yourself and it goes through.
    req = urllib.request.Request(
        f"{REGISTRY}/resolve/{sid}",
        headers={"User-Agent": "stub-recipe-demo"},
    )
    with urllib.request.urlopen(req) as r:
        view = json.loads(r.read())["view"]
    print("\nWhat the receipt discloses:")
    for e in view["not_disclosed"]:
        print(f"  {e['kind']}: {e.get('detail','')}")
    print(f"\nSignature valid: {view['operator_signature_valid']}")
    print(f"Customer reference stored as a digest: {view['principal'][:20]}...")
    print("\nThe advice was not false. It was just not the cheapest,")
    print("and until now there was no way for the customer to see why.")
