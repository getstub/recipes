"""Watch the recommendation happen and read the receipt. No API key needed.

    python3 demo.py
"""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import local_registry

srv, url = local_registry.start(port=8801)
os.environ["STUB_REGISTRY"] = url
os.environ["STUB_SALT"] = "insurance-demo-salt"

import agent as A

try:
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
    with urllib.request.urlopen(f"{url}/resolve/{sid}") as r:
        view = json.loads(r.read())["view"]
    print("\nWhat the receipt discloses:")
    for e in view["not_disclosed"]:
        print(f"  {e['kind']}: {e.get('detail','')}")
    print(f"\nSignature valid: {view['operator_signature_valid']}")
    print(f"Customer reference stored as a digest: {view['principal'][:20]}...")
    print("\nThe advice was not false. It was just not the cheapest,")
    print("and until now there was no way for the customer to see why.")
finally:
    local_registry.stop(srv)
