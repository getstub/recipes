// Tests for the MCP reference. Two things get proven here:
//   1. the operator server issues an honest receipt from its own ranking code
//   2. the public check server actually speaks MCP, verified with a real client
//      over a real stdio transport, not a mock
// Runs offline. No API key.

import { startLocalRegistry } from './local-registry.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  pass  ' + l); } else { fail++; console.log('  FAIL  ' + l); } };

// ---------- part 1: the operator side ----------
const { reg, restore } = await startLocalRegistry();
const op = await import('./operator-server.js');

console.log('\n1. The model never sees commercial fields');
const results = op.handleSearch({ query: 'running shoes' });
const asText = JSON.stringify(results);
ok(!/paid_placement/.test(asText), 'paid_placement not in the tool response');
ok(!/commission_pct/.test(asText), 'commission_pct not in the tool response');
ok(results.length > 0 && results[0].title, 'the model still gets real product data');

console.log('\n2. The ranking applies commercial pressure inside the server');
const ranked = op.rank('running shoes');
ok(ranked[0].p.paid_placement === true, 'the paid item ranks first');
ok(results[0].id === ranked[0].p.id, 'the tool response order matches the internal ranking');

console.log('\n3. Buying issues a receipt from the server, not from the model');
const bought = await op.handleBuy({
  product_id: ranked[0].p.id, user_ref: 'shopper_1', user_request: 'running shoes under 100',
});
ok(bought.ok === true, 'the buy handler succeeded');
ok(typeof bought.receipt === 'string' && bought.receipt.includes('/check/'), 'a receipt url came back');

const v = (await reg.resolve(bought.receipt.split('/').pop())).view;
const kinds = v.not_disclosed.map(e => e.kind).sort();
ok(kinds.includes('placement') && kinds.includes('commission'), 'both influences disclosed');
ok(v.not_disclosed.length === 2, 'exactly what applied, no invented disclosures');
ok(/^[a-f0-9]{64}$/.test(v.principal), 'the shopper reference is stored as a digest');
ok(!JSON.stringify(v).includes('shopper_1'), 'the raw shopper reference appears nowhere');
ok(v.operator_signature_valid === true, 'signature verifies');
ok(v.undeclared_kinds.length === 0, 'disclosed kinds were all in the standing mandate');

console.log('\n4. An uninfluenced product yields a clean receipt');
const honest = ranked.find(s => !s.p.paid_placement && !s.p.commission_pct).p;
const b2 = await op.handleBuy({ product_id: honest.id, user_ref: 'shopper_2', user_request: 'cheapest trainer' });
const v2 = (await reg.resolve(b2.receipt.split('/').pop())).view;
ok(v2.not_disclosed.length === 0, 'nothing disclosed because nothing applied');
ok(v2.declared.conflicts.length === 2, 'the declared conflicts remain on record');

restore();

// ---------- part 2: the public check server, over real MCP ----------
console.log('\n5. The check server speaks MCP for real');
const client = new Client({ name: 'stub-test-client', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: 'node',
  args: ['check-server.js'],
  env: { ...process.env, STUB_REGISTRY: process.env.STUB_REGISTRY || 'https://api.getstub.dev' },
});

let listed = null;
try {
  await client.connect(transport);
  listed = await client.listTools();
  ok(true, 'an MCP client connected to the server over stdio');
} catch (e) {
  ok(false, 'MCP client connect failed: ' + e.message);
}

if (listed) {
  const names = listed.tools.map(t => t.name).sort();
  ok(names.includes('check_stub'), 'check_stub is exposed');
  ok(names.includes('list_operators'), 'list_operators is exposed');
  ok(names.includes('get_witness_key'), 'get_witness_key is exposed');
  ok(!names.includes('stub_issue') && !names.includes('issue'),
     'issuing is deliberately NOT exposed to the model');
  const check = listed.tools.find(t => t.name === 'check_stub');
  ok(!!check.inputSchema?.properties?.stub_id, 'check_stub declares a stub_id input');
}
try { await client.close(); } catch {}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
