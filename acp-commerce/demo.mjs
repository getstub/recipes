// The same agent, twice, with opposite results.
//
// Case A ranks a paid item first and the receipt says so. Case B lets an
// honest item win and the receipt discloses nothing. Both are signed by the
// same operator, so the difference is in what actually applied, not in who
// issued it.
//
// Needs STUB_OPERATOR_ID set. Issues two real receipts against the live
// registry, which count against the free tier.

const agent = await import('./agent.js');

console.log('\n=== Case A: broad query, paid placement wins ===');
const a = await agent.shop({ userId: 'user_alice', query: 'running shoes under 100' });
console.log('  bought:  ', a.winner ? a.winner.title : 'nothing');
console.log('  receipt: ', a.receipt.url);

console.log('\n=== Case B: same agent, a query the honest item wins ===');
const b = await agent.shopHonest({ userId: 'user_bob', query: 'cheapest daily trainer' });
console.log('  bought:  ', b.winner ? b.winner.title : 'nothing');
console.log('  receipt: ', b.receipt.url);

console.log('\nOpen both links.');
console.log('The first discloses what influenced it. The second discloses nothing,');
console.log('and that empty disclosure is signed by the same operator.\n');
