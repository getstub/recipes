"""Tests for the LangChain reference. No API key, no network.

The agent runs with a scripted model, and the receipts it issues are checked
against the real registry logic running locally.

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
    stub_id = stub_url.rstrip("/").split("/")[-1]
    with urllib.request.urlopen(f"{url}/resolve/{stub_id}") as r:
        return json.loads(r.read())["view"]


def main():
    srv, url = local_registry.start()
    os.environ["STUB_REGISTRY"] = url
    os.environ["STUB_SALT"] = "langchain-test-salt"

    # imported after the env is set so the client points at the local registry
    import agent as A
    from scripted_model import ScriptedModel

    try:
        print("\n1. The agent runs and the tools are wired into LangChain")
        result = A.run("user_lc_1", "running shoes under 100", ScriptedModel())
        messages = result["messages"]
        tool_names = [
            tc["name"]
            for m in messages
            for tc in (getattr(m, "tool_calls", None) or [])
        ]
        ok("search_products" in tool_names, "the agent called search_products")
        ok("buy" in tool_names, "the agent called buy")
        ok(len(A.TOOLS) == 2, "two tools are exposed to the framework")

        print("\n2. Commercial fields never reach the model")
        tool_output = " ".join(
            str(m.content) for m in messages if getattr(m, "type", "") == "tool"
        )
        ok("paid_placement" not in tool_output, "paid_placement is not in any tool result")
        ok("commission_pct" not in tool_output, "commission_pct is not in any tool result")
        ok("title" in tool_output, "the model still received real product data")

        print("\n3. The ranking applied commercial pressure")
        ok(A.LAST_RANKING[0]["paid_placement"] is True, "the paid item ranked first")

        print("\n4. The receipt records what the ranking did")
        receipt_url = None
        for m in messages:
            if getattr(m, "type", "") == "tool" and "check/" in str(m.content):
                for token in str(m.content).replace("'", '"').split('"'):
                    if "/check/" in token:
                        receipt_url = token
                        break
        ok(receipt_url is not None, "a receipt url came back from the buy tool")

        view = resolve(url, receipt_url)
        kinds = sorted(e["kind"] for e in view["not_disclosed"])
        ok("placement" in kinds, "placement was disclosed")
        ok("commission" in kinds, "commission was disclosed")
        ok("partner_only" in kinds, "partner-only was disclosed")
        ok(len(kinds) == 3, "exactly the three influences that applied, no invented ones")
        ok(
            str(A.LAST_RANKING[0]["commission_pct"]) in json.dumps(view["not_disclosed"]),
            "the commission figure matches the item that won",
        )

        print("\n5. Privacy holds")
        principal = view["principal"]
        ok(
            len(principal) == 64 and all(c in "0123456789abcdef" for c in principal),
            "the principal is stored as a digest",
        )
        ok("user_lc_1" not in json.dumps(view), "the raw user id appears nowhere in the record")

        print("\n6. Integrity")
        ok(view["operator_signature_valid"] is True,
           "the signature verifies, so the Python client signed correctly")
        ok(len(view["undeclared_kinds"]) == 0,
           "every disclosed kind was covered by the standing mandate")
        ok(view["value_moved"]["amount"] == A.LAST_RANKING[0]["price"],
           "the receipt records the price actually paid")

        print("\n7. An uninfluenced pick produces a clean receipt")
        result2 = A.run("user_lc_2", "cheapest daily trainer",
                        ScriptedModel(pick="sku_pace_light"))
        url2 = None
        for m in result2["messages"]:
            if getattr(m, "type", "") == "tool" and "check/" in str(m.content):
                for token in str(m.content).replace("'", '"').split('"'):
                    if "/check/" in token:
                        url2 = token
                        break
        view2 = resolve(url, url2)
        ok(len(view2["not_disclosed"]) == 0,
           "nothing was disclosed, because nothing applied")
        ok(len(view2["declared"]["conflicts"]) == 3,
           "the operator's declared conflicts are still on record")

    finally:
        local_registry.stop(srv)

    print(f"\n{'ALL PASS' if not FAIL else 'FAILURES'}, {len(PASS)} passed, {len(FAIL)} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
