// Runs the real Stub registry logic in-process, backed by an in-memory SQLite,
// and monkeypatches global fetch so the unmodified client talks to it as if it
// were the live api.getstub.dev. This lets the reference run and be verified
// with no network. Point the client at the real registry (its default) when
// you run outside the sandbox.
//
// This imports the ACTUAL registry.js and local-db.js from the backend, so
// what it proves here is what the deployed Worker does.

import { Registry } from '../../backend/registry.js';
import { makeLocalDb } from '../../backend/local-db.js';

export async function startLocalRegistry() {
  const db = makeLocalDb();
  const witness = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const reg = new Registry(db, witness.privateKey);

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const path = u.replace(/^https?:\/\/[^/]+/, '');
    const body = opts.body ? JSON.parse(opts.body) : {};
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
      status, headers: { 'Content-Type': 'application/json' },
    });

    if (path === '/register' && opts.method === 'POST') {
      return json(await reg.registerOperator(body));
    }
    if (path === '/issue' && opts.method === 'POST') {
      return json(await reg.issue(body));
    }
    if (path.startsWith('/check/') || path.startsWith('/resolve/')) {
      const id = path.split('/').pop();
      const r = await reg.resolve(id);
      return json(r);
    }
    if (path === '/health' || path === '') {
      return json({ ok: true, service: 'stub-registry-local', version: '0.1' });
    }
    // fall through to the real network for anything else
    return realFetch(url, opts);
  };

  return { reg, restore: () => { globalThis.fetch = realFetch; } };
}
