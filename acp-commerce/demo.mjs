// End-to-end proof: the same operator produces an influenced receipt and a
// clean one, depending on what actually applied. Runs against in-process
// registry logic so it verifies with no network.
import { startLocalRegistry } from './local-registry.mjs';
const { reg, restore } = await startLocalRegistry();

// import the agent module ONCE so we reuse its single registered operator
const agentMod = await import('./agent.js');

console.log('\n=== Case A: broad query, paid placement wins ===');
const a = await agentMod.shop({ userId: 'user_alice', query: 'running shoes under 100' });
const va = (await reg.resolve(a.receipt.url.split('/').pop())).view;
console.log('  verdict:', va.not_disclosed.length ? 'INFLUENCED by ' + va.not_disclosed.map(e=>e.kind).join(', ') : 'clean');

console.log('\n=== Case B: same agent, a query the honest item wins ===');
// shopHonest reuses the same stub instance inside agent.js via a second call,
// but we need the honest item to actually top the ranking. Ask for cheapest,
// and drop the paid item so nothing commercial applies to the winner.
const b = await agentMod.shopHonest({ userId: 'user_bob', query: 'cheapest daily trainer' });
const vb = (await reg.resolve(b.receipt.url.split('/').pop())).view;
console.log('  verdict:', vb.not_disclosed.length ? 'influenced' : 'CLEAN, nothing applied and the operator signed that');
console.log('  declared conflicts still on record:', JSON.stringify(vb.declared.conflicts));

restore();
console.log('\nSame operator, opposite results, both real signed receipts.');
