"""Watch the agent run, then read the receipt it issued.

    export STUB_OPERATOR_ID=op_yourname_langchain
    python3 demo.py

No model key needed: the model is scripted, so the ranking is the same every
time. The receipt is real. It is signed by your keypair, stored at the
registry, and it counts against the free tier.
"""
import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import agent as A
from scripted_model import ScriptedModel

REGISTRY = os.environ.get("STUB_REGISTRY", "https://api.getstub.dev")

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

if receipt_url:
    sid = receipt_url.rstrip("/").split("/")[-1]
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
    print(f"\nPrincipal stored as a digest: {view['principal'][:20]}...")
    print(f"Signature valid: {view['operator_signature_valid']}")

print("\nThe model did nothing wrong. It bought the top result.")
print("The ranking decided what the top result was.")
print("\nOpen the receipt link. Anyone can.")
