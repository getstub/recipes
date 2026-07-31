# Going to production

The recipes are built to be read and run. Every one of them generates a fresh keypair, issues a few stubs, and exits. That is right for learning and wrong for deployment, and the gap between the two is small but sharp.

These are the notes from taking an agent from a recipe to something that runs twice a day, unattended, issuing real receipts. We hit all of it ourselves building Field Notes, our own agent. Where we got something wrong, it is written down here rather than tidied away.

## 1. Your keypair is your identity. Persist it.

This is the one that bites first and hardest.

There is no account, no password, no email. The keypair is the operator. Whoever holds the private key can issue as you, and if you lose it you cannot issue as yourself again.

Every recipe does this:

```js
const stub = new Stub({ operator: 'My Agent', declared: {...} });
```

That generates a new keypair on first use. Run it twice, get two identities. In a script that is fine. In anything that restarts, it means your agent forgets who it is, and the second registration under the same operator id is refused, correctly, because a different key is asking for a claimed name.

Do this once, locally, to create the identity:

```js
const stub = new Stub({ operator: 'My Agent', operatorId: 'op_mine', declared: {...} });
await stub.register();
console.log(JSON.stringify(await stub.exportKeys()));
```

Store that JSON somewhere you will still have in a year. A secrets manager, your platform's secret store, a password manager. Not a file in the repo.

Then load it on every run:

```js
const stub = await Stub.fromKeys(JSON.parse(process.env.STUB_KEYPAIR), {
  operator: 'My Agent',
  operatorId: 'op_mine',
  declared: { paid_by: '...', conflicts: [...] },
  principalSalt: process.env.STUB_SALT,
});
```

Note `Stub.fromKeys`, not the constructor. Passing stored JWK to `new Stub({ keypair })` does not work, because the constructor expects live `CryptoKey` objects. We lost an afternoon to exactly this and shipped a bug that failed on first deploy.

Re-registering with the same key is fine and updates your name and mandate. Registering with a different key is refused, which is the thing stopping anyone taking your operator id.

If you need to change keys, `rotateKeys()` handles it: it signs the new registration with the key currently on record, so only you can do it, and your history stays intact because every stub records the key that signed it.

## 2. Your salt is as important as your key

`principalSalt` is what turns your internal user id into the digest that reaches the registry. Change it and the same user hashes to something different, which quietly breaks your own erasure story: you can no longer point at a user's past receipts to delete their mapping.

Store it with the keypair, treat it with the same care, and never regenerate it casually.

## 3. Declare the mandate before you write the integration

Counterintuitive, and the most valuable thing we found.

The mandate asks two questions: who pays you, and which classes of conflict exist in your business at all. Answering the second one honestly forces you to enumerate influences you may never have listed. Building our own agent, we started with "we have no commercial conflicts" and ended with six declared kinds, four of which had nothing to do with money: we rank on engagement sometimes, we prefer primary sources, we cannot see paywalled material, and we only read English.

None of that was hidden. It was just never named. Naming it made the agent better before a single receipt existed.

Write the mandate first. It will tell you where the receipts belong.

## 4. Put the receipt where the ranking happens

Not at the end of the request. Not in a middleware. At the line where your code decided one option beats another.

That line already knows why. It applied the boost, read the commission, filtered to partners. Everything the receipt needs is in scope right there, and nowhere else is it all in scope at once. If you find yourself reconstructing "what influenced this" after the fact, you are in the wrong place.

## 5. Issue for actions, not for steps

A stub marks a completed thing a person would want to hold you accountable for. Booked, bought, recommended, chose.

Not: called an API, read a page, scored a candidate. If you are issuing once per second, something has gone wrong. One test settles most cases: if this went wrong, would the person want a receipt for it?

## 6. Test against the free tier, with a separate operator id

There is no sandbox. The free tier is generous enough to be one: 1,000 stubs a month, which is far more than a test suite needs.

Two things to know before you point your tests at it. Records are permanent and public, because the registry is append only, so `test_user_1` receipts with junk in the free text will sit on your operator's record forever. And they count as issuance.

So use a separate operator id for development, something like `op_yours_dev`, and keep your production id clean. It costs nothing and it means your public record is only ever real work.

## 7. Guard against issuing twice, and against issuing nothing

Two failures we hit that are worth stealing.

If a scheduler can retry your job, it can issue a second receipt for the same action. On an append-only registry that leaves a duplicate nothing can retract. Check whether the work is already done before you issue.

And if your inputs fail, do not issue a receipt for an action that did not happen. A signed record attesting an empty run is worse than a missed run. We now refuse to sign an edition with nothing in it.

## 8. Watch out for Node-isms if you deploy to an edge runtime

The client runs anywhere with Web Crypto. If you deploy to Cloudflare Workers, Deno, or similar, be aware that code which passes locally on Node can fail there, because Node provides globals the edge does not. We hit this twice in one afternoon on our own agent, and both bugs passed every test we had.

Version 0.2.2 of the client fixes the ones we found. If you are on an edge runtime, pin at least that.

## 9. What the record must never contain

The client hashes the principal for you and the registry rejects anything that is not a digest, so user identifiers are handled. The free text fields are not.

`requested` and `done` are public and permanent. Describe the action, not the person. No names, no emails, no addresses, no order contents that identify someone. The client warns in development if something looks like an email or a phone number, and that warning is a floor, not a guarantee.

## Language parity, stated plainly

The JavaScript client is ahead of the Python one. Key rotation and the structural disclosure kinds landed in `@getstub/agent` 0.2.2 and are not yet in `getstub` for Python, which sits at 0.1.0. Issuing, hashing, and signatures are identical and cross-verify between the two.

Persisting an identity works in both, with different method names. JavaScript uses `exportKeys()` and `Stub.fromKeys()`. Python uses `export_keypair()` and `load_keypair()`. If you need key rotation today, you need the JavaScript client. Parity is coming.

## The shortest version

Persist your keys and your salt. Write the mandate first and let it surprise you. Put the receipt at the ranking line. Issue for finished actions. Use a dev operator id. Do not sign anything that did not happen.

Copyright Stub 2026
