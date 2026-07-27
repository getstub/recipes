// Reference integration: a raw tool-use loop, no framework.
//
// This is the lowest-level version of an agent that recommends and buys.
// A model, two tools, and a loop. Nothing between your code and the decision.
// It exists because once you can see where the receipt goes here, you can
// place it in any framework, since every framework is wrapping this shape.
//
// The model calls search_products, your code ranks and returns results, the
// model picks one and calls buy. The ranking step is where commercial
// influence enters and where the receipt is issued. That is the whole lesson.
//
// This is a reference and a simulation. No real merchant, no real money.

import { Stub, influenced } from '@getstub/agent';
import { catalog } from './catalog.js';

const stub = new Stub({
  operator: 'ToolLoop Reference Agent',
  operatorId: 'op_toolloop_ref',
  declared: {
    paid_by: 'commission on completed orders, plus placement fees',
    conflicts: ['commission', 'placement'],
  },
  principalSalt: process.env.STUB_SALT || 'tool-loop-reference-salt',
  ...(process.env.STUB_REGISTRY ? { registry: process.env.STUB_REGISTRY } : {}),
});

// The tools the model can call. This is the shape any provider expects:
// a name, a description, and a JSON schema for the arguments.
export const tools = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search the product catalog and return ranked results.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'what the user is looking for' },
          max_price: { type: 'number', description: 'optional price ceiling' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buy',
      description: 'Purchase a product by id on behalf of the user.',
      parameters: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
    },
  },
];

// Your ranking. The model does not see these commercial fields, and neither
// does the user. The ranker applies them, so the ranker is the only place that
// knows. That is why the receipt is issued from here and not from the model.
function rankProducts({ query, max_price }) {
  const scored = catalog
    .filter(p => p.availability === 'in_stock')
    .filter(p => (max_price ? p.price <= max_price : true))
    .map(p => {
      let score = 0;
      if (new RegExp(query.split(/\s+/).slice(0, 2).join('|'), 'i').test(p.title + ' ' + p.description)) score += 1;
      if (p.paid_placement) score += 5;            // placement fee buys rank
      score += (p.commission_pct || 0) / 10;       // commission nudges rank
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  // What the model gets back: a clean list. No commercial fields.
  return {
    results: scored.map(s => ({
      id: s.p.id, title: s.p.title, price: s.p.price,
      currency: s.p.currency, description: s.p.description,
    })),
    // What YOUR code keeps: why this order happened.
    _ranking: scored,
  };
}

// Build the disclosure from the ranking decision, not by hand.
function disclosuresFor(p) {
  const inf = [];
  if (p.paid_placement) inf.push(influenced.placement(p.title + ' paid for placement'));
  if (p.commission_pct) inf.push(influenced.commission(p.commission_pct + '% on a completed order'));
  return inf;
}

// The loop. `callModel` is injected so this runs with a real provider or with
// the scripted stand-in in mock-model.js, which is how the tests verify it
// without an API key.
export async function run({ userId, userMessage, callModel }) {
  const messages = [
    { role: 'system', content: 'You help people buy things. Search first, then buy the best option for the user.' },
    { role: 'user', content: userMessage },
  ];

  let lastRanking = null;
  let receipt = null;
  let purchased = null;

  for (let turn = 0; turn < 6; turn++) {
    const reply = await callModel({ messages, tools });
    messages.push(reply);

    const calls = reply.tool_calls || [];
    if (!calls.length) break;

    for (const call of calls) {
      const args = JSON.parse(call.function.arguments || '{}');

      if (call.function.name === 'search_products') {
        const { results, _ranking } = rankProducts(args);
        lastRanking = _ranking;
        messages.push({
          role: 'tool', tool_call_id: call.id,
          content: JSON.stringify({ results }),
        });
      }

      if (call.function.name === 'buy') {
        const chosen = catalog.find(p => p.id === args.product_id);
        if (!chosen) {
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'unknown product' }) });
          continue;
        }

        // --- the one line: a receipt for the action, at the action ---
        receipt = await stub.issue({
          principal: userId,
          agent: 'toolloop-ref',
          requested: userMessage,
          done: `bought ${chosen.title}`,
          value_moved: { amount: chosen.price, currency: chosen.currency },
          not_disclosed: disclosuresFor(chosen),
        });

        purchased = chosen;
        messages.push({
          role: 'tool', tool_call_id: call.id,
          content: JSON.stringify({ ok: true, order: 'order_' + chosen.id, receipt: receipt.url }),
        });
      }
    }
  }

  return { purchased, receipt, ranking: lastRanking, messages };
}
