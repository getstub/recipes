"""Watch the agent run and see the receipt it produces. No API key needed.

    python3 demo.py
"""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import local_registry

srv, url = local_registry.start()
os.environ["STUB_REGISTRY"] = url
os.environ["STUB_SALT"] = "langchain-demo-salt"

import agent as A
from scripted_model import ScriptedModel

try:
    result = A.run("user_demo_1", "running shoes under 100", ScriptedModel())

    print("\nThe ranking your code produced:")
    for i, p in enumerate(A.LAST_RANKING, 1):
        why = ", ".join(filter(None, [
            "paid placement" if p["paid_placement"] else "",
            f"{p['commission_pct']}% commission" if p["commission_pct"] else "",
        ])) or "no commercial influence"
        print(f"  {i}. {p['title']:<28} {why}")

    receipt_url = None
    for m in result["messages"]:
        if getattr(m, "type", "") == "tool" and "check/" in str(m.content):
            for tok in str(m.content).replace("'", '"').split('"'):
                if "/check/" in tok:
                    receipt_url = tok

    print(f"\nThe agent bought: {A.LAST_RANKING[0]['title']}")
    print(f"Receipt: {receipt_url}")

    sid = receipt_url.rstrip("/").split("/")[-1]
    with urllib.request.urlopen(f"{url}/resolve/{sid}") as r:
        view = json.loads(r.read())["view"]
    print("\nWhat the receipt discloses:")
    for e in view["not_disclosed"]:
        print(f"  {e['kind']}: {e.get('detail','')}")
    print(f"\nPrincipal stored as a digest: {view['principal'][:20]}...")
    print(f"Signature valid: {view['operator_signature_valid']}")
    print("\nThe model did nothing wrong. It bought the top result.")
    print("The ranking decided what the top result was.")
finally:
    local_registry.stop(srv)
