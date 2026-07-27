"""Tests for the insurance reference. No API key, no network.

Run: python3 test_recipe.py
"""

import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import local_registry

PASS, FAIL = [], []


def ok(cond, label):
    (PASS if cond else FAIL).append(label)
    print(("  pass  " if cond else "  FAIL  ") + label)


def resolve(url, stub_url):
    sid = stub_url.rstrip("/").split("/")[-1]
    with urllib.request.urlopen(f"{url}/resolve/{sid}") as r:
        return json.loads(r.read())["view"]


def main():
    srv, url = local_registry.start(port=8802)
    os.environ["STUB_REGISTRY"] = url
    os.environ["STUB_SALT"] = "insurance-test-salt"

    import agent as A
    from policies import PANEL

    try:
        print("\n1. Commercial pressure shapes the recommendation")
        ranked = A.rank(250000)
        top = ranked[0]
        cheapest = A.cheapest_suitable(250000)
        ok(top["commission_pct"] > 0, "the recommended policy pays the operator commission")
        ok(top["id"] != cheapest["id"], "the recommendation is not the cheapest suitable policy")
        ok(cheapest["commission_pct"] == 0, "the cheapest policy happens to pay nothing")
        ok(ranked[-1]["on_panel"] is False, "the off panel insurer was ranked last")

        print("\n2. The cost of that is real, not rhetorical")
        gap = (top["monthly_premium"] - cheapest["monthly_premium"]) * 12 * 20
        ok(gap > 500, f"the customer pays about {gap:.0f} more over the term")

        print("\n3. The receipt records what the engine applied")
        top2, receipt, _ = A.recommend(
            customer_ref="customer_t1", cover_needed=250000,
            request_text="term life cover, 250000, twenty years",
        )
        ok(receipt is not None and "/check/" in receipt["url"], "a receipt url came back")
        view = resolve(url, receipt["url"])
        kinds = sorted(e["kind"] for e in view["not_disclosed"])
        ok("commission" in kinds, "commission was disclosed")
        ok("partner_only" in kinds, "the panel restriction was disclosed")
        ok(str(top2["commission_pct"]) in json.dumps(view["not_disclosed"]),
           "the commission figure matches the policy that won")

        print("\n4. Own brand is disclosed when it applies")
        own = next(p for p in PANEL if p["own_group"])
        inf = A.disclosures_for(own)
        ok(any(e["kind"] == "own_brand" for e in inf),
           "a policy from the parent company discloses own_brand")

        print("\n5. Privacy holds, which matters more here than in shopping")
        principal = view["principal"]
        ok(len(principal) == 64 and all(c in "0123456789abcdef" for c in principal),
           "the customer reference is stored as a digest")
        ok("customer_t1" not in json.dumps(view),
           "the raw customer reference appears nowhere in the record")
        ok(all(tok not in json.dumps(view).lower()
               for tok in ('@', 'date_of_birth', 'nhs', 'national insurance')),
           "no personal identifiers leaked into the record")

        print("\n6. Integrity")
        ok(view["operator_signature_valid"] is True, "the signature verifies")
        ok(len(view["undeclared_kinds"]) == 0,
           "every disclosed kind was covered by the standing mandate")
        ok(view["value_moved"]["amount"] == top2["monthly_premium"],
           "the receipt records the premium actually recommended")

        print("\n7. A clean recommendation is possible and provable")
        # if the panel restriction is lifted and the winner pays nothing, the
        # receipt comes back empty, which is itself signed evidence
        honest = A.cheapest_suitable(250000)
        inf_honest = A.disclosures_for(honest)
        ok(len(inf_honest) == 0,
           "the off panel, zero commission policy produces no disclosures")

    finally:
        local_registry.stop(srv)

    print(f"\n{'ALL PASS' if not FAIL else 'FAILURES'}, {len(PASS)} passed, {len(FAIL)} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
