// Tests for the reference integration. A builder should be able to run these
// and see for themselves that the receipts say what the ranking did.
// Runs entirely against in-process registry logic. No network needed.

import { startLocalRegistry } from './local-registry.mjs';

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  pass  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};

const { reg, restore } = await startLocalRegistry();
const agent = await import('./agent.js');

console.log('\n1. An influenced pick records every influence that applied');
const a = await agent.shop({ userId: 'user_test_a', query: 'running shoes under 100' });
const va = (await reg.resolve(a.receipt.url.split('/').pop())).view;
const kindsA = va.not_disclosed.map(e => e.kind).sort();
ok(a.winner.paid_placement === true, 'the paid item won the ranking');
ok(kindsA.includes('placement'), 'placement was disclosed');
ok(kindsA.includes('commission'), 'commission was disclosed');
ok(kindsA.includes('partner_only'), 'partner-only was disclosed');
ok(va.not_disclosed.length === 3, 'exactly the three influences that applied, no more');

console.log('\n2. The disclosures match the winner, not the catalog');
const detailText = JSON.stringify(va.not_disclosed);
ok(detailText.includes(a.winner.title), 'the disclosure names the item that actually won');
ok(detailText.includes(String(a.winner.commission_pct)), 'the commission figure is the winner\'s real rate');

console.log('\n3. Privacy: no raw user id reaches the registry');
ok(/^[a-f0-9]{64}$/.test(va.principal), 'principal stored as a 64-char digest');
ok(!JSON.stringify(va).includes('user_test_a'), 'the raw user id appears nowhere in the record');

console.log('\n4. An honest pick produces a clean receipt, and that is signed proof');
const b = await agent.shopHonest({ userId: 'user_test_b', query: 'cheapest daily trainer' });
const vb = (await reg.resolve(b.receipt.url.split('/').pop())).view;
ok(vb.not_disclosed.length === 0, 'nothing was disclosed because nothing applied');
ok(vb.declared.conflicts.length === 3, 'the operator\'s declared conflicts are still on record');
ok(b.winner.paid_placement === false && !b.winner.commission_pct, 'the winner genuinely had no commercial influence');

console.log('\n5. Integrity: signatures verify and the mandate is coherent');
ok(va.operator_signature_valid === true, 'influenced receipt signature verifies');
ok(vb.operator_signature_valid === true, 'clean receipt signature verifies');
ok(va.undeclared_kinds.length === 0, 'every disclosed kind was covered by the standing mandate');

console.log('\n6. The ACP checkout completed for both');
ok(a.order.status === 'completed' && a.order.total === a.winner.price, 'influenced flow checked out at the right total');
ok(b.order.status === 'completed' && b.order.total === b.winner.price, 'clean flow checked out at the right total');

restore();
console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
