# Stub recipes

[![Stub](https://api.getstub.dev/badge/op_recipes.svg)](https://getstub.dev/o/op_recipes)

Working reference integrations for [Stub](https://getstub.dev), the allegiance receipt registry for AI agents.

Each recipe is a runnable agent with Stub wired in at the line where the ranking picks a winner. Clone one, run it, read the receipt it produces.

Every recipe here is a reference and a simulation. No real merchants, no real money, no real users. Nobody is running these in production, and each README says so. The point is to show exactly where a receipt belongs in code you recognise.

## The recipes

| Recipe | What it shows | Language |
|---|---|---|
| [`tool-loop`](./tool-loop) | The primitive every framework wraps. A model, two tools, a loop. | JavaScript |
| [`acp-commerce`](./acp-commerce) | Allegiance lives upstream of checkout, in the ranking. | JavaScript |
| [`mcp`](./mcp) | A public check server any agent can add, plus the operator issuing pattern. | JavaScript |
| [`langchain-python`](./langchain-python) | The same integration inside a LangChain agent. | Python |
| [`vercel-ai-sdk`](./vercel-ai-sdk) | The biggest agent surface in JavaScript. | JavaScript |
| [`insurance-advice`](./insurance-advice) | The primitive outside commerce, with real stakes. | Python |

Every recipe runs against the live registry and issues real receipts, under an
operator id you choose. The free tier is 1,000 stubs a month, so trying all six
costs nothing. There is no offline mode and no mock registry: the only way to
issue a stub is to issue one.

## The badge above

These recipes are exercised against the live registry every day, and the badge
is drawn from the receipts that run produces. It is not a build status: it says
the reference agents ranked their catalogues, disclosed what influenced the
result, and issued signed records anyone can open. Click it to read them.

If it ever goes quiet, the recipes stopped working and this repo is telling you
so before you clone it.

## Start here

If you are new to this, read [`tool-loop`](./tool-loop) first. It is the smallest one and it carries the lesson the others repeat: the model does nothing wrong, the ranking decided.

```
cd tool-loop
npm install
export STUB_OPERATOR_ID=op_yourname_toolloop
npm run demo
```

Pick an operator id that is yours. The first run registers it and saves your
keypair to `.stub-keys.json`, which is gitignored. Every run after that uses the
same identity.

The demo prints the ranking your code produced, with the reason beside each
item, and then a receipt link anyone can open.

## When you are ready to deploy

The recipes generate a fresh keypair each run, which is right for reading and wrong for production. [`PRODUCTION.md`](./PRODUCTION.md) covers what changes: persisting your identity, where the receipt belongs, what never goes in the free text, and the mistakes we made taking our own agent live.

## What a stub is

When your agent acts for someone, it issues a small signed record: who asked, what was done, what money moved, and what commercial influence applied. The person served checks it at a neutral registry, not on your servers and not on ours.

Here is a live one before you install anything:

https://api.getstub.dev/check/72b4baee1719ec34acc5df5c514a12fd2e19b9a6776de4b45706988f765c77d8

## The integration, in full

```js
import { Stub, influenced } from '@getstub/agent';

const stub = new Stub({
  operator: 'Your Agent',
  declared: {
    paid_by: 'the user, subscription',
    conflicts: ['commission'],
  },
});

// at the line where your ranker picks a winner:
const inf = [];
if (pick.paid_placement) inf.push(influenced.placement(pick.seller));
if (pick.commission_pct) inf.push(influenced.commission(pick.commission_pct + '%'));

const receipt = await stub.issue({
  principal: user.id,        // hashed on your side, never sent raw
  agent: 'your-agent',
  requested: query,
  done: `booked ${pick.name}`,
  value_moved: { amount: pick.price, currency: 'USD' },
  not_disclosed: inf,        // an empty array is signed proof none applied
});
```

Python is the same shape:

```python
from getstub import Stub, influenced
```

## Two things that keep coming up

**Nobody hand writes disclosures.** Your ranking code already knows when a commission or a placement fee shaped a result, because it applied it. The receipt reads the same flags at the same line. It scales the way your ranking scales.

**An empty disclosure is not nothing.** It is a signature saying conflicts exist in your business and none of them touched this action. That is worth more than silence, and it is why honest operators have something to gain here.

## Install

```
npm install @getstub/agent
pip install getstub
```

Both clients sign over the same canonical form, verified rather than assumed: the Python test suite signs a stub and has the registry code verify it.

## Free tier

1,000 stubs a month. Checking is free forever, because charging the person being served to verify would defeat the point.

## Links

- [getstub.dev](https://getstub.dev)
- Registry: https://api.getstub.dev
- Witness key: https://api.getstub.dev/witness
- Directory of operators: https://api.getstub.dev/directory

Copyright Stub 2026
