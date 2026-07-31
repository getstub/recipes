// Runs the same loop against a real model and the live registry.
// Needs OPENAI_API_KEY. Issues a real receipt you can open in a browser.
import { run } from './agent.js';
import { makeOpenAIModel } from './openai-model.js';

if (!process.env.OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY first. Run `npm run demo` for the scripted version.');
  process.exit(1);
}
const r = await run({
  userId: process.argv[2] || 'user_demo_7',
  userMessage: process.argv.slice(3).join(' ') || 'running shoes under 100',
  callModel: makeOpenAIModel(),
});
console.log('Bought:', r.purchased?.title);
console.log('Receipt:', r.receipt?.url);
console.log('Open that link to see what the agent did not disclose.');
