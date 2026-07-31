// Runs the loop against the live registry and prints the receipt it issued.
//
// Needs STUB_OPERATOR_ID set. Uses a scripted model, so no model key is needed
// and the ranking is the same every time. The receipt is real: it is signed by
// your keypair, stored at the registry, and anyone can open the link.

import { run } from './agent.js';
import { makeMockModel } from './mock-model.js';

const r = await run({
  userId: process.argv[2] || 'user_demo_7',
  userMessage: process.argv.slice(3).join(' ') || 'running shoes under 100',
  callModel: makeMockModel(),
});

console.log('\nWhat the ranking produced:\n');
for (const line of (r.ranking || [])) console.log('  ' + JSON.stringify(line));
console.log('\nPurchased:', r.purchased ? JSON.stringify(r.purchased) : 'nothing');
console.log('\nReceipt:', r.receipt ? r.receipt.url : 'none issued');
console.log('\nOpen that link. It shows what was done and what influenced it.\n');
