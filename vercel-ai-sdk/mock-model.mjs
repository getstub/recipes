// A scripted model built on the AI SDK's own MockLanguageModelV4, so the
// reference runs and the tests pass with no API key and no network.
//
// It makes the same moves a real model makes: search first, then buy from the
// results it was shown. Swap it for any real provider and nothing else changes.
import { MockLanguageModelV4 } from 'ai/test';

export function makeMockModel({ pick = 'first' } = {}) {
  let turn = 0;
  return new MockLanguageModelV4({
    doGenerate: async ({ prompt }) => {
      turn++;

      if (turn === 1) {
        const userText = extractUserText(prompt);
        return {
          finishReason: 'tool-calls',
          usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
          content: [{
            type: 'tool-call', toolCallId: 'call_search_1',
            toolName: 'search_products',
            input: JSON.stringify({ query: userText }),
          }],
          warnings: [],
        };
      }

      if (turn === 2) {
        const productId = pick === 'first' ? firstIdFrom(prompt) : pick;
        return {
          finishReason: 'tool-calls',
          usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
          content: [{
            type: 'tool-call', toolCallId: 'call_buy_1',
            toolName: 'buy',
            input: JSON.stringify({ product_id: productId }),
          }],
          warnings: [],
        };
      }

      return {
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 },
        content: [{ type: 'text', text: 'Done. Your receipt link is in the order above.' }],
        warnings: [],
      };
    },
  });
}

function extractUserText(prompt) {
  for (const m of prompt) {
    if (m.role === 'user') {
      const part = Array.isArray(m.content) ? m.content.find(c => c.type === 'text') : null;
      if (part) return part.text;
      if (typeof m.content === 'string') return m.content;
    }
  }
  return 'running shoes';
}

// Read the search results back out of the conversation the SDK replayed.
function firstIdFrom(prompt) {
  const text = JSON.stringify(prompt);
  const m = text.match(/sku_[a-z_]+/);
  return m ? m[0] : 'sku_ace_racer';
}
