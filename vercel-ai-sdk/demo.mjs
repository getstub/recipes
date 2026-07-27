// Watch the agent run and read the receipt it produced. No API key needed.
import { startLocalRegistry } from './local-registry.mjs';
const { reg, restore } = await startLocalRegistry();
const A = await import('./agent.js');
const { makeMockModel } = await import('./mock-model.mjs');

const res = await A.run({ userId:'user_demo_1', message:'running shoes under 100', model: makeMockModel() });

console.log('\nThe ranking your code produced:');
A.lastRanking.forEach((p, i) => {
  const why = [p.paid_placement && 'paid placement', p.commission_pct && `${p.commission_pct}% commission`]
    .filter(Boolean).join(', ') || 'no commercial influence';
  console.log(`  ${i+1}. ${p.title.padEnd(28)} ${why}`);
});

const buy = res.steps.flatMap(s => s.toolResults || []).find(t => t.toolName === 'buy');
const out = buy?.output ?? buy?.result;
console.log(`\nThe agent bought: ${out.title} at $${out.price}`);
console.log('Receipt:', out.receipt);

const v = (await reg.resolve(out.receipt.split('/').pop())).view;
console.log('\nWhat the receipt discloses:');
v.not_disclosed.forEach(e => console.log(`  ${e.kind}: ${e.detail || ''}`));
console.log(`\nPrincipal stored as a digest: ${v.principal.slice(0,20)}...`);
console.log(`Signature valid: ${v.operator_signature_valid}`);
console.log('\nThe model did nothing wrong. It bought the top result.');
console.log('The ranking decided what the top result was.');
restore();
