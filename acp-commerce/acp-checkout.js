// A mock of the Agentic Commerce Protocol checkout, in memory.
// ACP defines five checkout endpoints: create session, update, get state,
// complete, cancel. This models the same shape as plain functions so the
// reference runs with no server, no Stripe, no network. It is a simulation
// of the merchant side, clearly labelled, not a real ACP implementation.
//
// The point of including it is to show WHERE in a real agent-to-merchant
// flow the Stub receipt is issued: at the agent's choice, before checkout,
// not inside the payment step the merchant owns.

const sessions = new Map();
let counter = 1000;

// create a checkout session for a chosen item (ACP: POST /checkout_sessions)
export function createSession({ item, quantity = 1 }) {
  const id = 'acp_sess_' + counter++;
  const session = {
    id,
    status: 'ready_for_payment',
    line_items: [{ id: item.id, title: item.title, unit_price: item.price, quantity }],
    currency: item.currency,
    total: item.price * quantity,
    fulfillment: { method: 'standard', eta_days: 4 },
  };
  sessions.set(id, session);
  return session;
}

// get current state (ACP: GET /checkout_sessions/:id)
export function getState(id) {
  const s = sessions.get(id);
  if (!s) throw new Error('unknown session');
  return s;
}

// complete the purchase (ACP: POST /checkout_sessions/:id/complete)
// In real ACP the merchant charges via their PSP with a delegated payment
// token. Here it just flips status. No money moves.
export function completeSession(id) {
  const s = sessions.get(id);
  if (!s) throw new Error('unknown session');
  s.status = 'completed';
  s.order_id = 'order_' + Math.random().toString(36).slice(2, 10);
  return s;
}

export function cancelSession(id) {
  const s = sessions.get(id);
  if (!s) throw new Error('unknown session');
  s.status = 'canceled';
  return s;
}
