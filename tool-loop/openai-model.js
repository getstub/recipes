// The real model adapter. Needs OPENAI_API_KEY in the environment.
// Shape matches the mock exactly, so the loop code does not change.
export function makeOpenAIModel({ model = 'gpt-4o' } = {}) {
  return async function callModel({ messages, tools }) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({ model, messages, tools, tool_choice: 'auto' }),
    });
    const j = await res.json();
    if (j.error) throw new Error('OpenAI: ' + j.error.message);
    return j.choices[0].message;
  };
}
