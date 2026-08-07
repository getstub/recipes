// Your identity, kept between runs.
//
// The keypair is the operator. Generate a new one every run and the registry
// will refuse the second registration, because a different key is asking for a
// name that is already claimed. So the first run creates a keypair and saves it
// next to this file; every run after that loads it.
//
// This is the same thing you will do in production, just with a file instead of
// a secrets manager.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Stub from '@getstub/agent';

const here = dirname(fileURLToPath(import.meta.url));
const KEYFILE = join(here, '.stub-keys.json');

function requireOperatorId(suggestion) {
  const id = process.env.STUB_OPERATOR_ID;
  if (id) return id;
  console.error(
    '\nSet STUB_OPERATOR_ID first. It is your name on the registry, and it has to be\n' +
    'yours rather than one shared by everyone who clones this.\n\n' +
    `  export STUB_OPERATOR_ID=${suggestion}\n\n` +
    'Pick anything unclaimed. Your first run registers it and saves the keypair to\n' +
    '.stub-keys.json in this folder, which is gitignored.\n'
  );
  process.exit(1);
}

/**
 * Returns a Stub client with a stable identity across runs.
 *
 * @param {object} opts
 * @param {string} opts.operator     human readable name
 * @param {string} opts.suggestion   example id to show if none is set
 * @param {object} opts.declared     the standing mandate
 * @param {string} opts.salt         principal salt, stable per operator
 */
export async function getStub({ operator, suggestion, declared, salt }) {
  const operatorId = requireOperatorId(suggestion);
  const registry = process.env.STUB_REGISTRY;      // defaults to the live registry
  const opts = {
    operator,
    operatorId,
    declared,
    principalSalt: process.env.STUB_SALT || salt,
    ...(registry ? { registry } : {}),
  };

  // A keypair in the environment wins over one on disk. This is the shape a
  // real deployment uses, where the key comes from a secrets manager rather
  // than a file next to the code, and it is what lets this run in CI without
  // writing a private key onto a build machine.
  if (process.env.STUB_KEYPAIR) {
    return await Stub.fromKeys(JSON.parse(process.env.STUB_KEYPAIR), opts);
  }

  if (existsSync(KEYFILE)) {
    const jwk = JSON.parse(readFileSync(KEYFILE, 'utf8'));
    return await Stub.fromKeys(jwk, opts);
  }

  const stub = new Stub(opts);
  await stub.register();
  const keys = await stub.exportKeys();
  writeFileSync(KEYFILE, JSON.stringify(keys, null, 2));
  console.log(`Registered ${operatorId}. Keypair saved to .stub-keys.json, keep it.`);
  return stub;
}
