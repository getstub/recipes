# Stub over MCP

Two pieces, because issuing and checking belong in different places.

1. **`check-server.js`** a public, read only MCP server. Add it to any MCP capable agent and that agent can verify Stub receipts. Safe for anyone to run, because checking is free forever.
2. **`operator-server.js`** a reference storefront that exposes its own tools over MCP and issues receipts internally, from its own ranking code.

This is a reference and a simulation. No real merchant, no real money.

## Why issuing is not an MCP tool

The obvious design would expose `stub_issue` so a model can call it. That design is wrong, and it is worth being explicit about why.

A receipt is only worth reading because the operator's own code fills in what influenced an action. The ranking code is the only thing that knows a placement fee moved a product to the top, because the ranking code applied it. A model does not know that, cannot verify it, and would be guessing. A guessed disclosure is worse than no disclosure, because it looks like evidence.

So the model never decides what to disclose. It calls your `buy` tool, and your handler issues the receipt from the same code that did the ranking. The MCP layer changes nothing about where the receipt comes from.

What a model can safely do is **check**. That is read only, it cannot be gamed by the party being audited, and it is the half that belongs in a public server.

## Run the tests

```
npm install
export STUB_OPERATOR_ID=op_yourname_mcp
npm run demo
```

Pick an operator id that is yours. The first run registers it and saves your
keypair to `.stub-keys.json` in this folder, which is gitignored. Every run
after that loads the same identity, which is what you will do in production
with a secrets manager instead of a file.

The receipt it issues is real. It is signed by your key, stored at the
registry, and the link opens in a browser. It counts against the free tier,
which is 1,000 stubs a month.

## Add the check server to an agent

Any MCP client config, for example:

```json
{
  "mcpServers": {
    "stub": {
      "command": "node",
      "args": ["/path/to/check-server.js"]
    }
  }
}
```

Tools it exposes:

- `check_stub` verify a receipt by id and see what influenced the action
- `list_operators` who is issuing, who pays them, what conflicts they declare
- `get_witness_key` the registry public key, so countersignatures verify independently

Set `STUB_REGISTRY` to point somewhere other than `https://api.getstub.dev`.

## The operator pattern

If you already expose tools to agents over MCP, this is the whole change. Inside your existing handler:

```js
import { Stub, influenced } from '@getstub/agent';

export async function handleBuy({ product_id, user_ref, user_request }) {
  const chosen = catalog.find(p => p.id === product_id);

  const inf = [];
  if (chosen.paid_placement) inf.push(influenced.placement(chosen.title + ' paid for placement'));
  if (chosen.commission_pct) inf.push(influenced.commission(chosen.commission_pct + '% on a completed order'));

  const receipt = await stub.issue({
    principal: user_ref,        // hashed on your side, never sent raw
    agent: 'your-storefront',
    requested: user_request,
    done: `sold ${chosen.title}`,
    value_moved: { amount: chosen.price, currency: chosen.currency },
    not_disclosed: inf,         // empty array is signed proof none applied
  });

  return { ok: true, order: '...', receipt: receipt.url };
}
```

Return the receipt url in your tool response. The calling agent can hand it to the person it is acting for, and they can check it somewhere neither of you controls.

## What the tests prove

Worth running rather than reading. Among the 21:

- commercial fields never appear in the tool response the model receives
- the paid item ranks first, and the response order matches the internal ranking
- the receipt records exactly the influences that applied, with no invented ones
- the shopper reference is stored as a digest and the raw value appears nowhere
- an uninfluenced purchase yields a clean receipt with the declared conflicts still on record
- a real MCP client connects to the check server over stdio and lists its tools
- issuing is verifiably absent from the tools the model can call

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

- [`tool-loop`](../tool-loop) where the receipt goes with no framework
- [`acp-commerce`](../acp-commerce) the commerce version

- All six recipes: [github.com/getstub/recipes](https://github.com/getstub/recipes)
- Docs and quickstart: [getstub.dev](https://getstub.dev)
- What the badge below means: [getstub.dev/mark](https://getstub.dev/mark)

[![Stub](https://api.getstub.dev/badge/op_recipes.svg)](https://getstub.dev/o/op_recipes)

These recipes are run against the live registry every day. The badge is drawn
from the receipts that run produces, so if it goes quiet, something here broke.
