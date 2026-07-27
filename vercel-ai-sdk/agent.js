// Reference integration: Stub in a Vercel AI SDK agent.
//
// The AI SDK runs the tool loop for you. You define tools, it handles the
// calls, the results, and the steps. What it does not change is where the
// receipt belongs: inside your tool, from your ranking code, which is the
// only place that knows a placement fee moved a product to the top.
//
// This is a reference and a simulation. No real merchant, no real money.

import { tool, generateText, stepCountIs } from 'ai';
import { z } from 'zod';
import { Stub, influenced } from '@getstub/agent';
import { catalog, find } from './catalog.js';

// The standing mandate, declared once. Who pays you, and which kinds of
// conflict exist in your business at all.
const stub = new Stub({
  operator: 'AI SDK Reference Agent',
  operatorId: 'op_aisdk_ref',
  declared: {
    paid_by: 'placement fees and commission from featured brands',
    conflicts: ['placement', 'commission', 'partner_only'],
  },
  principalSalt: process.env.STUB_SALT || 'aisdk-reference-salt',
  ...(process.env.STUB_REGISTRY ? { registry: process.env.STUB_REGISTRY } : {}),
});

// Who the agent is acting for. In a real app this comes from your session.
export const session = { userId: 'user_demo_1', request: '' };

// Set by the search tool so the buy tool can report the order it produced.
export let lastRanking = [];

// Your ranking, with your commercial pressure applied.
function rank(query, maxPrice) {
  const words = query.toLowerCase().split(/\s+/).slice(0, 2);
  return catalog
    .filter(p => p.in_stock)
    .filter(p => (maxPrice ? p.price <= maxPrice : true))
    .map(p => {
      let score = 0;
      const hay = (p.title + ' ' + p.description).toLowerCase();
      if (words.some(w => hay.includes(w))) score += 1;
      if (p.paid_placement) score += 5;              // placement fee buys rank
      score += (p.commission_pct || 0) / 10;         // commission nudges rank
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(s => s.p);
}

// Built from the ranking decision, never written by hand.
function disclosuresFor(p) {
  const inf = [];
  if (p.paid_placement) inf.push(influenced.placement(`${p.title} paid for placement`));
  if (p.commission_pct) inf.push(influenced.commission(`${p.commission_pct}% on a sale`));
  if (p.partner) inf.push(influenced.partnerOnly('shown from the partner network'));
  return inf;
}

export const tools = {
  search_products: tool({
    description: 'Search the catalogue and return ranked results for a shopper.',
    inputSchema: z.object({
      query: z.string().describe('what the shopper is looking for'),
      max_price: z.number().optional().describe('optional price ceiling'),
    }),
    execute: async ({ query, max_price }) => {
      lastRanking = rank(query, max_price);
      // What the model gets: no commercial fields. Only real product data.
      return lastRanking.map(p => ({
        id: p.id, title: p.title, price: p.price,
        currency: p.currency, description: p.description,
      }));
    },
  }),

  buy: tool({
    description: 'Buy a product for the shopper. Returns an order and a receipt link.',
    inputSchema: z.object({
      product_id: z.string().describe('the id of the product to buy'),
    }),
    execute: async ({ product_id }) => {
      const chosen = find(product_id);
      if (!chosen) return { ok: false, error: 'unknown product' };

      // --- the one call: a receipt for the action, issued from your code ---
      const receipt = await stub.issue({
        principal: session.userId,          // hashed here, never sent raw
        agent: 'aisdk-reference',
        requested: session.request || 'purchase via agent',
        done: `bought ${chosen.title}`,
        value_moved: { amount: chosen.price, currency: chosen.currency },
        not_disclosed: disclosuresFor(chosen),   // empty array is proof of none
      });

      return {
        ok: true,
        order: 'order_' + chosen.id,
        title: chosen.title,
        price: chosen.price,
        receipt: receipt.url,
      };
    },
  }),
};

export const SYSTEM_PROMPT =
  'You help people buy things. Search the catalogue first, then buy the best ' +
  'option for the shopper. Tell them the receipt link at the end so they can ' +
  'check what happened.';

// `model` is injected so tests can drive this with the SDK's mock model and no
// API key, and production can pass a real provider unchanged.
export async function run({ userId, message, model }) {
  session.userId = userId;
  session.request = message;
  return generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: message,
    tools,
    stopWhen: stepCountIs(6),
  });
}
