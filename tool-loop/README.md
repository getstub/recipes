# Stub in a raw tool-use loop

An agent that searches and buys, built with nothing but a model, two tools, and a loop. No framework. Stub is wired in at the line where your ranking picks a winner.

This is the lowest-level version on purpose. Once you can see where the receipt goes here, you can place it in any framework, because every framework is wrapping this same shape.

This is a reference and a simulation. No real merchant, no real money.

## The lesson in one line

The model does nothing wrong. It searches, gets a list, and buys the top result, which is what models do. Your ranking decided what the top result was, and your ranking is the only place that knows a placement fee put it there. That is why the receipt is issued from your ranking code, not from the model.

## Run it

```
npm install
export STUB_OPERATOR_ID=op_yourname_toolloop
npm run demo
```

Pick an operator id that is yours. The first run registers it and saves your
keypair to `.stub-keys.json` in this folder, which is gitignored. Every run
after that loads the same identity, which is what you will do in production
with a secrets manager instead of a file.

The receipt it issues is real. It is signed by your key, stored at the
registry, and the link opens in a browser. It counts against the free tier,
which is 1,000 stubs a month, so a few runs cost you nothing.

With a real model instead of the scripted one:

```
export OPENAI_API_KEY=sk-...
npm run live -- user_demo_7 running shoes under 100
```

## Files

- `agent.js` the loop, the tools, the ranking, and the one Stub call
- `catalog.js` a mock catalog carrying commercial flags the model never sees
- `mock-model.js` a scripted stand-in so the demo runs with no model key
- `openai-model.js` the real adapter, same shape, swap it in
- `identity.mjs` loads your keypair, or creates and saves one on first run

## The one line

```js
import { Stub, influenced } from '@getstub/agent';

// in your buy handler, where you already know what was chosen:
const inf = [];
if (chosen.paid_placement) inf.push(influenced.placement(chosen.title + ' paid for placement'));
if (chosen.commission_pct) inf.push(influenced.commission(chosen.commission_pct + '% on a completed order'));

await stub.issue({
  principal: user.id,          // hashed on your side, never sent raw
  agent: 'your-agent',
  requested: userMessage,
  done: `bought ${chosen.title}`,
  value_moved: { amount: chosen.price, currency: chosen.currency },
  not_disclosed: inf,          // empty array is signed proof that none applied
});
```

## What to look at when you run it

- the commercial flags in `catalog.js` never reach the model, only your ranker sees them
- the paid item ranks first, and the model buys what the ranking surfaced
- the receipt records the influences that actually applied, and nothing else
- the raw user id appears nowhere on the record, only a digest
- run it with a query where nothing paid, and the receipt discloses nothing. That empty disclosure is signed, and it sits next to the conflicts you declared at registration.

Copyright Stub 2026

---

## New here?

[Stub](https://getstub.dev) is an allegiance receipt for AI agents. When an agent
acts on someone's behalf, it issues a small signed record of what it did and what
commercial influence applied. The person served checks that record at a neutral
registry rather than on the operator's own servers, so the operator's word is
never what is being trusted.

The load-bearing field is `not_disclosed`. It is where the agent records what it
held back: partner-only searches, paid placement, a commission the user never
saw. An honest agent leaves it empty, and an empty field is itself signed proof
that nothing applied.

Open a real receipt before installing anything:

https://api.getstub.dev/check/72b4baee1719ec34acc5df5c514a12fd2e19b9a6776de4b45706988f765c77d8

**The JavaScript client:** `npm i @getstub/agent`

**Closest to this recipe:**

- [`acp-commerce`](../acp-commerce) the same idea inside an agentic commerce checkout
- [`langchain-python`](../langchain-python) the same idea in a framework

- All six recipes: [github.com/getstub/recipes](https://github.com/getstub/recipes)
- Docs and quickstart: [getstub.dev](https://getstub.dev)
- What the badge below means: [getstub.dev/mark](https://getstub.dev/mark)

[![Stub](https://api.getstub.dev/badge/op_recipes.svg)](https://getstub.dev/o/op_recipes)

These recipes are run against the live registry every day. The badge is drawn
from the receipts that run produces, so if it goes quiet, something here broke.
