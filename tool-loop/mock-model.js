// A scripted stand-in for a model, so the reference runs and the tests pass
// with no API key and no network. It makes the same tool calls a real model
// makes: search first, then buy the top result.
//
// Swap this for openai-model.js to run against a real provider.
// A variant that buys a named product, used to show the clean-receipt case
// where the model picks something no commercial flag touched.
export function makeMockModelPicking(productId) {
  let turn = 0;
  return async function callModel({ messages }) {
    turn++;
    if (turn === 1) {
      const userMsg = messages.find(m => m.role === 'user').content;
      return { role: 'assistant', content: null, tool_calls: [{
        id: 'call_search_1', type: 'function',
        function: { name: 'search_products', arguments: JSON.stringify({ query: userMsg }) } }] };
    }
    if (turn === 2) {
      return { role: 'assistant', content: null, tool_calls: [{
        id: 'call_buy_1', type: 'function',
        function: { name: 'buy', arguments: JSON.stringify({ product_id: productId }) } }] };
    }
    return { role: 'assistant', content: 'Done.' };
  };
}

export function makeMockModel() {
  let turn = 0;
  return async function callModel({ messages }) {
    turn++;
    if (turn === 1) {
      const userMsg = messages.find(m => m.role === 'user').content;
      return {
        role: 'assistant', content: null,
        tool_calls: [{
          id: 'call_search_1', type: 'function',
          function: { name: 'search_products', arguments: JSON.stringify({ query: userMsg }) },
        }],
      };
    }
    if (turn === 2) {
      // the model picks the first result it was shown, which is what a model does
      const toolMsg = [...messages].reverse().find(m => m.role === 'tool');
      const first = JSON.parse(toolMsg.content).results[0];
      return {
        role: 'assistant', content: null,
        tool_calls: [{
          id: 'call_buy_1', type: 'function',
          function: { name: 'buy', arguments: JSON.stringify({ product_id: first.id }) },
        }],
      };
    }
    return { role: 'assistant', content: 'Done. I bought the top option for you.' };
  };
}
