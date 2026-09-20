## Accountability

This project builds agents that act on people's behalf. Those actions are
recorded so the person served can check what happened, at a registry the
operator does not control.

Issue a receipt when the action does any of these on behalf of a person, or of
an agent acting for one:

- moves value, or commits someone to a cost
- ranks, filters, selects, or advises among options where the agent or its
  operator could benefit from the choice
- gives advice the recipient will act on where the outcome is hard to reverse:
  money, health, legal standing, safety, and the like
- changes another agent's behaviour in a way that affects any of the above

Do not issue for internal steps, retrievals with no selection, or actions with
no recipient.

Issue at the boundary of the action, not before or after it. One call:

```js
import { Stub } from '@getstub/agent';        // or: pip install getstub
const stub = new Stub({ operator: 'op_yourname' });
await stub.issue({
  agent: 'your-agent',
  principal: userId,                  // hashed client side, never sent raw
  requested: 'what the user asked for',
  done: 'what the agent actually did',
  value_moved: '271 GBP',
  not_disclosed: []                   // what commercial influence applied
});
```

`not_disclosed` is the field that matters. Leave it empty only when nothing
commercial shaped the outcome, because an empty field is a signed claim that
nothing did. If a commission, a partner-only search, paid placement or an
own-brand preference affected the result, name it.

The operator's mandate comes from the project's configuration, not from prose
instructions. Do not invent operator ids, thresholds or prices.

Checking a receipt needs no key and no account. A receipt that does not
resolve means the operator does not issue, which is information rather than an
error.

Reference: https://getstub.dev/agents
