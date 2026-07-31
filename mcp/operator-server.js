// A reference operator MCP server: your own tools, exposed over MCP, with
// Stub issuing receipts internally at the line where your ranking picks a winner.
//
// This is the shape that matters for adoption. You already expose tools to
// agents over MCP. The receipt is issued inside your tool handler, from your
// ranking code, where the commercial flags actually live. The calling model
// never sees those flags and never decides what to disclose. It could not do
// that honestly even if you asked it to.
//
// This is a reference and a simulation. No real merchant, no real money.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { influenced } from '@getstub/agent';
import { getStub } from './identity.mjs';
import { catalog } from './catalog.js';

// One client, created on first use and reused. Your identity lives in
// .stub-keys.json so the same operator issues every time you run this.
let _stub;
async function stubClient() {
  if (!_stub) {
    _stub = await getStub({
      operator: 'MCP Reference Storefront',
      suggestion: 'op_yourname_mcp',
      declared: {
        paid_by: 'placement fees and commission from featured brands',
        conflicts: ['placement', 'commission'],
      },
      salt: 'mcp-reference-salt',
    });
  }
  return _stub;
}

// Your ranking, with your commercial pressure applied. Exactly as in any
// other integration. The MCP layer changes nothing about where this sits.
export function rank(query, maxPrice) {
  return catalog
    .filter(p => p.availability === 'in_stock')
    .filter(p => (maxPrice ? p.price <= maxPrice : true))
    .map(p => {
      let score = 0;
      if (new RegExp(query.split(/\s+/).slice(0, 2).join('|'), 'i').test(p.title + ' ' + p.description)) score += 1;
      if (p.paid_placement) score += 5;
      score += (p.commission_pct || 0) / 10;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function disclosuresFor(p) {
  const inf = [];
  if (p.paid_placement) inf.push(influenced.placement(p.title + ' paid for placement'));
  if (p.commission_pct) inf.push(influenced.commission(p.commission_pct + '% on a completed order'));
  return inf;
}

// The handler an MCP agent actually calls. Exported so tests can exercise it
// without standing up a transport.
export async function handleBuy({ product_id, user_ref, user_request }) {
  const chosen = catalog.find(p => p.id === product_id);
  if (!chosen) return { ok: false, error: 'unknown product' };

  // --- the one line: the receipt is issued here, from your code ---
  const receipt = await (await stubClient()).issue({
    principal: user_ref,                  // hashed on this side, never sent raw
    agent: 'mcp-reference-storefront',
    requested: user_request || 'purchase via agent',
    done: `sold ${chosen.title}`,
    value_moved: { amount: chosen.price, currency: chosen.currency },
    not_disclosed: disclosuresFor(chosen),
  });

  return { ok: true, order: 'order_' + chosen.id, item: chosen, receipt: receipt.url };
}

export function handleSearch({ query, max_price }) {
  const ranked = rank(query, max_price);
  // what the model gets: no commercial fields
  return ranked.map(s => ({
    id: s.p.id, title: s.p.title, price: s.p.price,
    currency: s.p.currency, description: s.p.description,
  }));
}

// Only stand up the server when run directly, so tests can import cleanly.
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new McpServer({ name: 'mcp-reference-storefront', version: '0.1.0' });

  server.registerTool(
    'search_products',
    {
      title: 'Search products',
      description: 'Search the storefront catalog and return ranked results.',
      inputSchema: {
        query: z.string().describe('what the shopper is looking for'),
        max_price: z.number().optional().describe('optional price ceiling'),
      },
    },
    async ({ query, max_price }) => ({
      content: [{ type: 'text', text: JSON.stringify({ results: handleSearch({ query, max_price }) }, null, 2) }],
    })
  );

  server.registerTool(
    'buy',
    {
      title: 'Buy a product',
      description:
        'Purchase a product on behalf of the shopper. Returns an order and a Stub receipt ' +
        'the shopper can check to see whose side this storefront was on.',
      inputSchema: {
        product_id: z.string(),
        user_ref: z.string().describe('your stable reference for the shopper'),
        user_request: z.string().optional().describe('what the shopper originally asked for'),
      },
    },
    async (args) => {
      const r = await handleBuy(args);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
