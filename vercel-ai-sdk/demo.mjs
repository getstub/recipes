// Watch the agent run, then read the receipt it issued.
//
//   export STUB_OPERATOR_ID=op_yourname_aisdk
//   npm run demo
//
// No model key needed: the model is scripted. The receipt is real, signed by
// your keypair, and it counts against the free tier.
const REGISTRY = process.env.STUB_REGISTRY || 'https://api.getstub.dev';
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

const res2 = await fetch(`${REGISTRY}/resolve/${out.receipt.split('/').pop()}`);
const v = (await res2.json()).view;
console.log('\nWhat the receipt discloses:');
v.not_disclosed.forEach(e => console.log(`  ${e.kind}: ${e.detail || ''}`));
console.log(`\nPrincipal stored as a digest: ${v.principal.slice(0,20)}...`);
console.log(`Signature valid: ${v.operator_signature_valid}`);
console.log('\nThe model did nothing wrong. It bought the top result.');
console.log('The ranking decided what the top result was.');
console.log('\nOpen the receipt link. Anyone can.');
