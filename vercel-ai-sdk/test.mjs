// Tests for the Vercel AI SDK reference. No API key, no network.
// The agent runs on the SDK's own mock model, and the receipts it issues are
// checked against the real registry logic running in process.

import { startLocalRegistry } from './local-registry.mjs';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  pass  ' + l); } else { fail++; console.log('  FAIL  ' + l); } };

const { reg, restore } = await startLocalRegistry();
const A = await import('./agent.js');
const { makeMockModel } = await import('./mock-model.mjs');

const receiptFrom = (res) => {
  const r = res.steps.flatMap(s => s.toolResults || []).find(t => t.toolName === 'buy');
  return (r?.output ?? r?.result)?.receipt;
};

console.log('\n1. The agent runs through the SDK tool loop');
const res = await A.run({ userId: 'user_v1', message: 'running shoes under 100', model: makeMockModel() });
const called = res.steps.flatMap(s => s.toolCalls || []).map(c => c.toolName);
ok(called.includes('search_products'), 'search_products was called');
ok(called.includes('buy'), 'buy was called');
ok(Object.keys(A.tools).length === 2, 'two tools are registered with the SDK');
ok(res.steps.length >= 2, 'the SDK ran a multi step loop');

console.log('\n2. Commercial fields never reach the model');
const searchOut = JSON.stringify(
  res.steps.flatMap(s => s.toolResults || []).filter(t => t.toolName === 'search_products')
);
ok(!/paid_placement/.test(searchOut), 'paid_placement is not in the tool result');
ok(!/commission_pct/.test(searchOut), 'commission_pct is not in the tool result');
ok(/title/.test(searchOut), 'the model still received real product data');

console.log('\n3. The ranking applied commercial pressure');
ok(A.lastRanking[0].paid_placement === true, 'the paid item ranked first');

console.log('\n4. The receipt records what the ranking did');
const url = receiptFrom(res);
ok(typeof url === 'string' && url.includes('/check/'), 'a receipt url came back from the buy tool');

const v = (await reg.resolve(url.split('/').pop())).view;
const kinds = v.not_disclosed.map(e => e.kind).sort();
ok(kinds.includes('placement'), 'placement was disclosed');
ok(kinds.includes('commission'), 'commission was disclosed');
ok(kinds.includes('partner_only'), 'partner-only was disclosed');
ok(v.not_disclosed.length === 3, 'exactly the three influences that applied, no invented ones');
ok(JSON.stringify(v.not_disclosed).includes(String(A.lastRanking[0].commission_pct)),
   'the commission figure matches the item that won');

console.log('\n5. Privacy holds');
ok(/^[a-f0-9]{64}$/.test(v.principal), 'the principal is stored as a digest');
ok(!JSON.stringify(v).includes('user_v1'), 'the raw user id appears nowhere in the record');

console.log('\n6. Integrity');
ok(v.operator_signature_valid === true, 'the signature verifies');
ok(v.undeclared_kinds.length === 0, 'every disclosed kind was in the standing mandate');
ok(v.value_moved.amount === A.lastRanking[0].price, 'the receipt records the price actually paid');

console.log('\n7. An uninfluenced pick produces a clean receipt');
const res2 = await A.run({
  userId: 'user_v2', message: 'cheapest daily trainer',
  model: makeMockModel({ pick: 'sku_pace_light' }),
});
const v2 = (await reg.resolve(receiptFrom(res2).split('/').pop())).view;
ok(v2.not_disclosed.length === 0, 'nothing was disclosed, because nothing applied');
ok(v2.declared.conflicts.length === 3, 'the operator\'s declared conflicts are still on record');

restore();
console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
