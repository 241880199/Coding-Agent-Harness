import { LLMProvider, LLMResponse, Action } from '../harness/types.js';

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private fetchFn: typeof fetch;

  constructor(apiKey: string, model: string = 'gpt-4o-mini', fetchFn: typeof fetch = globalThis.fetch) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetchFn = fetchFn;
  }

  async call(context: string[]): Promise<LLMResponse> {
    const response = await this.fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: context.map(c => ({ role: 'user', content: c })),
        tools: [{
          type: 'function',
          function: {
            name: 'call_tool',
            description: 'Call a tool',
            parameters: {
              type: 'object',
              properties: {
                tool: { type: 'string' },
                args: { type: 'object' },
              },
              required: ['tool', 'args'],
            },
          },
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error ${response.status}: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    const content = message.content || '';

    if (message.tool_calls && message.tool_calls.length > 0) {
      const tc = message.tool_calls[0].function;
      const args = JSON.parse(tc.arguments);
      return {
        text: content,
        action: { type: 'call_tool', tool: tc.name, args } as Action,
      };
    }

    return { text: content, action: { type: 'done' } };
  }
}