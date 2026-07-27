// Tests for the raw tool-loop reference. No API key, no network.
// Runs the real registry logic in process and a scripted model.

import { startLocalRegistry } from './local-registry.mjs';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  pass  ' + l); } else { fail++; console.log('  FAIL  ' + l); } };

const { reg, restore } = await startLocalRegistry();
const { run, tools } = await import('./agent.js');
const { makeMockModel, makeMockModelPicking } = await import('./mock-model.js');

console.log('\n1. The tool schema is the shape a provider expects');
ok(tools.length === 2, 'two tools exposed');
ok(tools.every(t => t.type === 'function' && t.function.name && t.function.parameters), 'each tool has a name and a schema');
ok(tools.some(t => t.function.name === 'search_products'), 'search_products present');
ok(tools.some(t => t.function.name === 'buy'), 'buy present');

console.log('\n2. Commercial fields never reach the model');
const r = await run({ userId: 'user_t1', userMessage: 'running shoes under 100', callModel: makeMockModel() });
const toolReplies = r.messages.filter(m => m.role === 'tool').map(m => m.content).join(' ');
ok(!/paid_placement/.test(toolReplies), 'paid_placement not sent to the model');
ok(!/commission_pct/.test(toolReplies), 'commission_pct not sent to the model');
ok(/title/.test(toolReplies), 'the model did get real product data');

console.log('\n3. The ranking applied commercial pressure');
ok(r.ranking[0].p.paid_placement === true, 'the paid item ranked first');
ok(r.purchased.id === r.ranking[0].p.id, 'the model bought what the ranking surfaced first');

console.log('\n4. The receipt records what the ranking did');
const v = (await reg.resolve(r.receipt.url.split('/').pop())).view;
const kinds = v.not_disclosed.map(e => e.kind).sort();
ok(kinds.includes('placement'), 'placement disclosed');
ok(kinds.includes('commission'), 'commission disclosed');
ok(v.not_disclosed.length === 2, 'exactly the two influences that applied');
ok(JSON.stringify(v.not_disclosed).includes(String(r.purchased.commission_pct)), 'the commission figure matches the item');

console.log('\n5. Privacy holds');
ok(/^[a-f0-9]{64}$/.test(v.principal), 'principal is a digest');
ok(!JSON.stringify(v).includes('user_t1'), 'raw user id appears nowhere in the record');

console.log('\n6. Integrity');
ok(v.operator_signature_valid === true, 'signature verifies');
ok(v.undeclared_kinds.length === 0, 'every disclosed kind was in the standing mandate');
ok(v.value_moved.amount === r.purchased.price, 'the receipt records the price actually paid');

console.log('\n7. When the model picks an uninfluenced item, the receipt is clean');
// same operator, same code path, but the model chooses a product no
// commercial flag touched. The empty disclosure is signed proof of that.
const r2 = await run({ userId: 'user_t2', userMessage: 'cheapest daily trainer',
                       callModel: makeMockModelPicking('sku_pace_light') });
const v2 = (await reg.resolve(r2.receipt.url.split('/').pop())).view;
ok(r2.purchased.id === 'sku_pace_light', 'the model bought the uninfluenced item');
ok(r2.purchased.paid_placement === false && !r2.purchased.commission_pct, 'that item genuinely carries no commercial flag');
ok(v2.not_disclosed.length === 0, 'the receipt discloses nothing, because nothing applied');
ok(v2.declared.conflicts.length === 2, 'the operator\'s declared conflicts are still on record');

restore();
console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
