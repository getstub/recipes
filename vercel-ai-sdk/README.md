# Stub in a Vercel AI SDK agent

A shopping agent built with the AI SDK, with Stub wired in at the line where your ranking picks a winner.

The SDK runs the tool loop for you: the calls, the results, the steps. What it does not change is where the receipt belongs. Your tool still does the ranking, and the ranking is still the only place that knows a placement fee moved a product to the top.

This is a reference and a simulation. No real merchant, no real money.

## Run it

```
npm install
export STUB_OPERATOR_ID=op_yourname_aisdk
npm run demo
```

Pick an operator id that is yours. The first run registers it and saves your
keypair to `.stub-keys.json` in this folder, which is gitignored. Every run
after that loads the same identity, which is what you will do in production
with a secrets manager instead of a file.

The receipt it issues is real. It is signed by your key, stored at the
registry, and the link opens in a browser. It counts against the free tier,
which is 1,000 stubs a month.

Against a real provider and the live registry:

```
npm install @ai-sdk/openai
export OPENAI_API_KEY=sk-...
npm run live -- running shoes under 100
```

That issues a real receipt you can open in a browser.

## The one call

Inside your tool's `execute`, where you already know what was chosen:

```js
import { tool } from 'ai';
import { z } from 'zod';
import { Stub, influenced } from '@getstub/agent';

const stub = new Stub({
  operator: 'Your Agent',
  declared: {
    paid_by: 'placement fees and commission from featured brands',
    conflicts: ['placement', 'commission'],
  },
});

export const tools = {
  buy: tool({
    description: 'Buy a product for the shopper.',
    inputSchema: z.object({ product_id: z.string() }),
    execute: async ({ product_id }) => {
      const chosen = find(product_id);

      const inf = [];
      if (chosen.paid_placement) inf.push(influenced.placement(`${chosen.title} paid for placement`));
      if (chosen.commission_pct) inf.push(influenced.commission(`${chosen.commission_pct}% on a sale`));

      const receipt = await stub.issue({
        principal: session.userId,     // hashed on your side, never sent raw
        agent: 'your-agent',
        requested: session.request,
        done: `bought ${chosen.title}`,
        value_moved: { amount: chosen.price, currency: chosen.currency },
        not_disclosed: inf,            // empty array is signed proof none applied
      });

      return { ok: true, order: '...', receipt: receipt.url };
    },
  }),
};
```

Return the receipt url from the tool and the model will pass it on to the shopper.

## Why the model never decides disclosures

Your ranking applied the boost, so your ranking is the only thing that knows it happened. A model asked to disclose commercial influence would be guessing about its operator's business, and a guessed disclosure is worse than none because it looks like evidence.

So the commercial fields never enter the tool result. The model sees titles, prices, and descriptions. Your code sees the rest, and signs for it.

## Files

- `agent.js` the tools, the ranking, and the one Stub call
- `catalog.js` a mock catalogue carrying commercial flags the model never sees
- `mock-model.mjs` built on the SDK's own `MockLanguageModelV4`, so tests need no key
- `demo.mjs` and `live.mjs` runners

## What the tests prove

Worth running rather than reading. Among the 21:

- the SDK ran a real multi step tool loop and called both tools
- commercial fields appear in no tool result the model receives
- the paid item ranked first, and the receipt records exactly the three influences that applied
- the raw user id appears nowhere in the record, only a digest
- the signature verifies against the real registry logic
- an uninfluenced purchase yields a clean receipt with the declared conflicts still on record

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

- [`tool-loop`](../tool-loop) the same shape the SDK is wrapping
- [`acp-commerce`](../acp-commerce) the commerce version

- All six recipes: [github.com/getstub/recipes](https://github.com/getstub/recipes)
- Docs and quickstart: [getstub.dev](https://getstub.dev)
- What the badge below means: [getstub.dev/mark](https://getstub.dev/mark)

[![Stub](https://api.getstub.dev/badge/op_recipes.svg)](https://getstub.dev/o/op_recipes)

These recipes are run against the live registry every day. The badge is drawn
from the receipts that run produces, so if it goes quiet, something here broke.
