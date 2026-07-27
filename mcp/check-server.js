// The Stub check server: an MCP server that lets any agent verify receipts.
//
// This is deliberately READ ONLY. It exposes checking, not issuing.
//
// Why issuing is not here: a receipt is only worth something if the operator's
// own code fills in what influenced an action, because the ranking code is the
// only thing that knows a commission or a placement fee applied. If a model
// decided what to disclose, it would be guessing about its operator's business,
// and a guessed disclosure is worse than none. Issuing belongs inside the
// operator's own server, at the ranking line. See operator-server.js.
//
// Checking is free forever, so this server is safe for anyone to add. Point any
// MCP capable agent at it and the person being served gains the ability to
// verify what an agent did on their behalf.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const REGISTRY = process.env.STUB_REGISTRY || 'https://api.getstub.dev';

async function getJson(path) {
  const res = await fetch(REGISTRY + path, { headers: { accept: 'application/json' } });
  return res.json();
}

const server = new McpServer({ name: 'stub-check', version: '0.1.0' });

server.registerTool(
  'check_stub',
  {
    title: 'Check a Stub receipt',
    description:
      'Verify what an AI agent did on someone\'s behalf, and whose side it was on. ' +
      'Takes a stub id and returns the signed record: what was asked, what was done, ' +
      'what money moved, and what commercial influence the operator disclosed. ' +
      'Resolves at a neutral registry, not on the agent\'s own servers.',
    inputSchema: { stub_id: z.string().describe('the 64 character stub id') },
  },
  async ({ stub_id }) => {
    const r = await getJson('/resolve/' + encodeURIComponent(stub_id));
    if (!r.ok) {
      return { content: [{ type: 'text', text: 'Not found or not valid: ' + (r.error || 'unknown') }] };
    }
    const v = r.view;
    const influence = v.not_disclosed.length
      ? v.not_disclosed.map(e => `- ${e.kind.replace(/_/g, ' ')}: ${e.detail || ''}`).join('\n')
      : '- nothing influenced this action, and the operator signed that';
    const lines = [
      `Operator: ${v.operator}`,
      `Asked: ${v.requested}`,
      `Did: ${v.done}`,
      v.value_moved ? `Money: ${JSON.stringify(v.value_moved)}` : 'Money: none',
      v.declared?.paid_by ? `Paid by: ${v.declared.paid_by}` : '',
      '',
      'What influenced this action:',
      influence,
      '',
      `Operator signature valid: ${v.operator_signature_valid}`,
      v.undeclared_kinds?.length
        ? `Note: discloses influence the operator never declared in its standing mandate (${v.undeclared_kinds.join(', ')})`
        : '',
    ].filter(Boolean);
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.registerTool(
  'list_operators',
  {
    title: 'List operators issuing receipts',
    description:
      'List the agent operators that issue Stub receipts, with who pays each one ' +
      'and which kinds of commercial conflict exist in their business.',
    inputSchema: {},
  },
  async () => {
    const r = await getJson('/directory');
    if (!r.ok) return { content: [{ type: 'text', text: 'Directory unavailable.' }] };
    const rows = (r.operators || []).map(o => {
      const conflicts = o.declared?.conflicts?.length ? o.declared.conflicts.join(', ') : 'none declared';
      const flag = o.isExample ? ' [example]' : '';
      return `${o.name}${flag}: paid by ${o.declared?.paid_by || 'undeclared'}, conflicts: ${conflicts}, ${o.stubsIssued} issued`;
    });
    return { content: [{ type: 'text', text: rows.join('\n') || 'No operators yet.' }] };
  }
);

server.registerTool(
  'get_witness_key',
  {
    title: 'Get the registry witness key',
    description:
      'Return the registry\'s public witness key, so countersignatures on checks ' +
      'can be verified independently without trusting the registry.',
    inputSchema: {},
  },
  async () => {
    const r = await getJson('/witness');
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
