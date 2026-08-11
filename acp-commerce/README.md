# Stub x Agentic Commerce Protocol, reference integration

A shopping agent that ranks products, surfaces one to the user, and runs an ACP-shaped checkout, with Stub wired in at the one line that matters: the moment the agent chooses what to surface.

This is a reference and a simulation. No real users, no real merchant, no Stripe, no cards. It exists to show exactly where a Stub receipt is issued in an agent-to-merchant commerce flow, and to give a builder something they can copy.

## The idea in one line

ACP defines how a merchant exposes checkout to an agent. But the agent decides *which product to surface* upstream of ACP, in its own ranking code, where paid placement and commission quietly shape the answer. That choice is invisible to the user and to the merchant. It is exactly where Stub issues its receipt.

## Files

- `catalog.js` a mock product feed. ACP feed fields plus the operator's own commercial flags (paid_placement, commission_pct, partner) that live in ranking code and never appear in a public feed.
- `acp-checkout.js` a mock of the five ACP checkout endpoints (create, get, complete, cancel) in memory. Stands in for the merchant side. No money moves.
- `agent.js` the reference agent. Ranks the catalog, surfaces the top item, issues a Stub at the ranking line, then runs ACP checkout.

## Run it

```
npm install
export STUB_OPERATOR_ID=op_yourname_shopmate
npm run demo
```

Pick an operator id that is yours. The first run registers it and saves your
keypair to `.stub-keys.json` in this folder, which is gitignored. Every run
after that loads the same identity, which is what you will do in production
with a secrets manager instead of a file.

The receipt it issues is real. It is signed by your key, stored at the
registry, and the link opens in a browser. It counts against the free tier,
which is 1,000 stubs a month.

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

---

## New here?

[Stub](https://getstub.dev) is an allegiance receipt for AI agents. When an agent
acts on someone's behalf, it issues a small signed record of what it did and what
commercial influence applied. The person served checks that record at a neutral
registry rather than on the operator's own servers, so the operator's word is
never what is being trusted.

The most important field is `not_disclosed`. It is where the agent records what it
held back: partner-only searches, paid placement, a commission the user never
saw. An honest agent leaves it empty, and an empty field is itself signed proof
that nothing applied.

Open a real receipt before installing anything:

https://api.getstub.dev/check/72b4baee1719ec34acc5df5c514a12fd2e19b9a6776de4b45706988f765c77d8

**The JavaScript client:** `npm i @getstub/agent`

**Closest to this recipe:**

- [`tool-loop`](../tool-loop) the same idea with no framework at all
- [`vercel-ai-sdk`](../vercel-ai-sdk) the same idea in the AI SDK

- All six recipes: [github.com/getstub/recipes](https://github.com/getstub/recipes)
- Docs and quickstart: [getstub.dev](https://getstub.dev)
- What the badge below means: [getstub.dev/mark](https://getstub.dev/mark)

[![Stub](https://api.getstub.dev/badge/op_recipes.svg)](https://getstub.dev/o/op_recipes)

These recipes are run against the live registry every day. The badge is drawn
from the receipts that run produces, so if it goes quiet, something here broke.
