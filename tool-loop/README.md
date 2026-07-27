# Stub in a raw tool-use loop

An agent that searches and buys, built with nothing but a model, two tools, and a loop. No framework. Stub is wired in at the line where your ranking picks a winner.

This is the lowest-level version on purpose. Once you can see where the receipt goes here, you can place it in any framework, because every framework is wrapping this same shape.

This is a reference and a simulation. No real merchant, no real money.

## The lesson in one line

The model does nothing wrong. It searches, gets a list, and buys the top result, which is what models do. Your ranking decided what the top result was, and your ranking is the only place that knows a placement fee put it there. That is why the receipt is issued from your ranking code, not from the model.

## Run it

```
npm install
npm test     # 22 tests, offline, no API key needed
npm run demo # watch the loop run and print the receipt
```

Against a real model and the live registry:

```
export OPENAI_API_KEY=sk-...
npm run live -- user_demo_7 running shoes under 100
```

That issues a real receipt you can open in a browser.

## Files

- `agent.js` the loop, the tools, the ranking, and the one Stub call
- `catalog.js` a mock catalog carrying commercial flags the model never sees
- `mock-model.js` a scripted stand-in so tests run with no API key
- `openai-model.js` the real adapter, same shape, swap it in
- `test.mjs` 22 tests covering the tool schema, what reaches the model, the disclosures, privacy, and integrity
- `local-registry.mjs` runs real registry logic in process so everything verifies offline

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

## What the tests prove

Worth running rather than reading. Among the 22:

- the commercial fields never reach the model, only your ranker sees them
- the paid item ranked first, and the model bought what the ranking surfaced
- the receipt records exactly the influences that applied, no more
- the raw user id appears nowhere in the record, only a digest
- when the model picks an uninfluenced item, the receipt discloses nothing, and that empty disclosure sits next to the operator's declared conflicts as signed proof

Copyright Stub 2026
