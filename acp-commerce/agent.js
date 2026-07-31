// Reference integration: a shopping agent on the Agentic Commerce Protocol,
// with Stub wired in at the one line that matters.
//
// The flow a real ChatGPT-style shopping agent runs:
//   1. user asks for something
//   2. agent ranks its catalog and picks one to surface  <-- allegiance lives here
//   3. agent runs ACP checkout against the merchant
//
// Step 2 is where paid placement and commission quietly shape the answer.
// It is upstream of ACP, in the agent's own ranking code, invisible to the
// user and to the merchant. That is exactly where Stub issues its receipt.
//
// This is a reference and a simulation. No real users, no real merchant,
// no Stripe, no cards. It talks to the live Stub registry so the receipts
// it produces are real and checkable.

import { influenced } from '@getstub/agent';
import { getStub } from './identity.mjs';
import { catalog } from './catalog.js';
import { createSession, completeSession } from './acp-checkout.js';

// One operator, declared once. This is the standing mandate: who pays the
// agent, and which conflict classes exist in its business at all.
// One client, created on first use and reused. Your identity lives in
// .stub-keys.json so the same operator issues every time you run this.
let _stub;
async function stubClient() {
  if (!_stub) {
    _stub = await getStub({
      operator: 'ShopMate Reference Agent',
      suggestion: 'op_yourname_shopmate',
      declared: {
        paid_by: 'brands it features, via placement fees and commission',
        conflicts: ['placement', 'commission', 'partner_only'],
      },
      salt: 'acp-reference-demo-salt',
    });
  }
  return _stub;
}

// The agent's ranking. In a real agent this is a model plus business rules.
// Here it is a transparent scorer so you can SEE the commercial influence:
// paid placement and commission push an item up. That push is the thing the
// user cannot see, and the thing the receipt will record.
function rank(query, items) {
  return items
    .filter(i => i.availability === 'in_stock')
    .map(i => {
      let score = 0;
      // a weak relevance signal so the demo is not purely commercial
      if (/run|trail|road|trainer|shoe/i.test(i.title + ' ' + i.description)) score += 1;
      // the commercial pressure the operator applies:
      if (i.paid_placement) score += 5;          // placement fee buys rank
      score += (i.commission_pct || 0) / 10;     // commission nudges rank
      return { item: i, score };
    })
    .sort((a, b) => b.score - a.score);
}

// Build the disclosure straight from the ranking decision. Nobody hand-writes
// this. The ranker already knows what pushed the winner up, because it applied
// the push. Stub reads the same flags at the same line and passes them through.
function disclosuresFor(item) {
  const inf = [];
  if (item.paid_placement) inf.push(influenced.placement(item.title + ' paid for placement'));
  if (item.commission_pct)  inf.push(influenced.commission(item.commission_pct + '% on a sale'));
  if (item.partner)         inf.push(influenced.partnerOnly('shown from the partner network'));
  return inf;
}

export async function shop({ userId, query }) {
  console.log(`\nUser (${userId}) asks: "${query}"`);

  // 2. rank and pick the item to surface
  const ranked = rank(query, catalog);
  const winner = ranked[0].item;
  console.log(`Agent surfaces: ${winner.title} at $${winner.price}`);
  console.log('Ranking order:', ranked.map(r => r.item.title).join('  >  '));

  // --- the one line: issue a receipt for the choice, at the choice ---
  const disclosures = disclosuresFor(winner);
  const receipt = await (await stubClient()).issue({
    principal: userId,                 // hashed client-side, never sent raw
    agent: 'shopmate-ref',
    requested: query,
    done: `surfaced ${winner.title} and offered checkout`,
    value_moved: { amount: winner.price, currency: winner.currency },
    not_disclosed: disclosures,        // empty array would be signed proof of none
  });
  console.log('Stub issued:', receipt.url);

  // 3. run the ACP checkout for the chosen item (mock merchant side)
  const session = createSession({ item: winner });
  const done = completeSession(session.id);
  console.log(`ACP checkout ${done.status}, order ${done.order_id}, total $${done.total}`);

  return { winner, receipt, order: done };
}

// A second entry point that surfaces the genuinely best-value item, the one
// with no placement fee and no commission. Same operator, same registration,
// so the receipt it issues has an empty not_disclosed: signed proof that
// conflicts exist in the business and none of them touched this action.
export async function shopHonest({ userId, query }) {
  console.log(`\nUser (${userId}) asks: "${query}"`);
  const honest = catalog
    .filter(i => i.availability === 'in_stock' && !i.paid_placement && !i.commission_pct)
    .sort((a, b) => a.price - b.price)[0];
  console.log(`Agent surfaces: ${honest.title} at $${honest.price}, the lowest price`);

  const receipt = await (await stubClient()).issue({
    principal: userId,
    agent: 'shopmate-ref',
    requested: query,
    done: `surfaced ${honest.title}, the lowest priced option`,
    value_moved: { amount: honest.price, currency: honest.currency },
    not_disclosed: [],   // nothing applied, and the operator signs that
  });
  console.log('Stub issued:', receipt.url);

  const session = createSession({ item: honest });
  const done = completeSession(session.id);
  console.log(`ACP checkout ${done.status}, order ${done.order_id}, total $${done.total}`);
  return { winner: honest, receipt, order: done };
}

// Run it if called directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2] || 'user_demo_42';
  const query = process.argv.slice(3).join(' ') || 'running shoes under 100';
  shop({ userId, query })
    .then(r => {
      console.log('\nDone. Open the receipt above to see what the agent did not disclose.');
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}
