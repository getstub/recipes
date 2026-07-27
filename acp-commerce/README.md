# Stub x Agentic Commerce Protocol, reference integration

A shopping agent that ranks products, surfaces one to the user, and runs an ACP-shaped checkout, with Stub wired in at the one line that matters: the moment the agent chooses what to surface.

This is a reference and a simulation. No real users, no real merchant, no Stripe, no cards. It exists to show exactly where a Stub receipt is issued in an agent-to-merchant commerce flow, and to give a builder something they can copy.

## The idea in one line

ACP defines how a merchant exposes checkout to an agent. But the agent decides *which product to surface* upstream of ACP, in its own ranking code, where paid placement and commission quietly shape the answer. That choice is invisible to the user and to the merchant. It is exactly where Stub issues its receipt.

## Files

- `catalog.js` a mock product feed. ACP feed fields plus the operator's own commercial flags (paid_placement, commission_pct, partner) that live in ranking code and never appear in a public feed.
- `acp-checkout.js` a mock of the five ACP checkout endpoints (create, get, complete, cancel) in memory. Stands in for the merchant side. No money moves.
- `agent.js` the reference agent. Ranks the catalog, surfaces the top item, issues a Stub at the ranking line, then runs ACP checkout.
- `local-registry.mjs` runs the real registry logic in-process so the reference verifies with no network.
- `test.mjs` 17 tests covering the disclosures, the privacy property, signature validity, and the checkout.

## Run it

```
npm install
npm test     # 17 tests, offline, against registry logic on your own machine
npm run demo # the two-case contrast, influenced vs clean
```

Against the live registry, which issues real receipts you can open in a browser:

```
npm start -- user_demo_42 running shoes under 100
```

Set `STUB_REGISTRY` to point somewhere else, and `STUB_SALT` to control principal hashing.

## The one line

Everything else is scaffolding. This is the integration:

```js
import { Stub, influenced } from '@getstub/agent';

const stub = new Stub({
  operator: 'ShopMate',
  declared: {
    paid_by: 'brands it features, via placement fees and commission',
    conflicts: ['placement', 'commission', 'partner_only'],
  },
});

// at the line where your ranker picks a winner:
const inf = [];
if (winner.paid_placement) inf.push(influenced.placement(winner.title + ' paid for placement'));
if (winner.commission_pct) inf.push(influenced.commission(winner.commission_pct + '% on a sale'));

await stub.issue({
  principal: user.id,                 // hashed on your side, never sent raw
  agent: 'shopmate',
  requested: query,
  done: `surfaced ${winner.title}`,
  value_moved: { amount: winner.price, currency: winner.currency },
  not_disclosed: inf,                 // empty array is signed proof of none
});
```

You do not hand-write the disclosures. Your ranker already knows what pushed the winner up, because it applied the push. The receipt reads the same flags.

## What the two cases show

`run-both.mjs` issues two receipts from the same operator:

- Case A: a broad query, the paid item wins, and the receipt records placement, commission, and partner-only influence.
- Case B: a query the honest item wins, nothing applied, and the receipt comes back clean with the operator's declared conflicts still on record. An empty disclosure is not nothing. It is a signature saying conflicts exist and none touched this action.

Same operator, opposite results, both real signed receipts.

Copyright Stub 2026
