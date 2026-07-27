// Runs the tool loop against in-process registry logic and a scripted model.
// No API key, no network. Shows the receipt the loop produces.
import { startLocalRegistry } from './local-registry.mjs';
const { reg, restore } = await startLocalRegistry();
const { run } = await import('./agent.js');
const { makeMockModel } = await import('./mock-model.js');

const r = await run({
  userId: 'user_demo_7',
  userMessage: 'running shoes under 100',
  callModel: makeMockModel(),
});

console.log('\nThe model searched, then bought:', r.purchased.title, '$' + r.purchased.price);
console.log('Ranking your code produced:');
r.ranking.forEach((s, i) => {
  const why = [s.p.paid_placement && 'paid placement', s.p.commission_pct && s.p.commission_pct + '% commission']
    .filter(Boolean).join(', ') || 'no commercial influence';
  console.log(`  ${i + 1}. ${s.p.title.padEnd(28)} ${why}`);
});
console.log('\nReceipt:', r.receipt.url);
const v = (await reg.resolve(r.receipt.url.split('/').pop())).view;
console.log('What it discloses:', v.not_disclosed.map(e => `${e.kind}: ${e.detail}`).join(' | ') || 'nothing');
console.log('Principal is a digest:', /^[a-f0-9]{64}$/.test(v.principal));
restore();
