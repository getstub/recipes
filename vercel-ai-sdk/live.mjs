// The same agent against a real provider and the live registry.
// Needs OPENAI_API_KEY and `npm install @ai-sdk/openai`.
import { openai } from '@ai-sdk/openai';
import { run } from './agent.js';

if (!process.env.OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY first. Run `npm run demo` for the scripted version.');
  process.exit(1);
}
const message = process.argv.slice(2).join(' ') || 'running shoes under 100';
const res = await run({ userId: 'user_live_1', message, model: openai('gpt-4o') });
const buy = res.steps.flatMap(s => s.toolResults || []).find(t => t.toolName === 'buy');
const out = buy?.output ?? buy?.result;
console.log('Bought:', out?.title);
console.log('Receipt:', out?.receipt);
console.log('Open that link to see what the agent did not disclose.');
