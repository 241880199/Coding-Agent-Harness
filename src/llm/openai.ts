import { LLMProvider, LLMResponse, Action, Message, ToolDefinition } from '../harness/types.js';

const SPECIAL_FUNCTIONS = ['take_note', 'spawn_subagent'];

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(apiKey: string, model: string = 'gpt-4o-mini', baseUrl?: string, fetchFn: typeof fetch = globalThis.fetch) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
    this.fetchFn = fetchFn;
  }

  async call(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const toolDefs = tools || [];
    const functions = [
      ...toolDefs.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      {
        type: 'function' as const,
        function: {
          name: 'take_note',
          description: 'Record an important fact, decision, or piece of knowledge to persistent memory for future sessions',
          parameters: {
            type: 'object',
            properties: {
              note: { type: 'string', description: 'The note content to record' },
            },
            required: ['note'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'spawn_subagent',
          description: 'Delegate a subtask to a sub-agent that runs independently and returns a result',
          parameters: {
            type: 'object',
            properties: {
              subtask: { type: 'string', description: 'The subtask description for the sub-agent to work on' },
            },
            required: ['subtask'],
          },
        },
      },
    ];

    const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      }),
        tools: functions,
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
      const toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

      let parsedArgs: Record<string, unknown>;
      try {
        parsedArgs = JSON.parse(tc.arguments);
      } catch {
        return {
          text: content,
          action: { type: 'unknown' },
          toolCalls,
        };
      }

      if (tc.name === 'take_note') {
        return {
          text: content,
          action: { type: 'take_note', note: parsedArgs.note as string } as Action,
          toolCalls,
        };
      }

      if (tc.name === 'spawn_subagent') {
        return {
          text: content,
          action: { type: 'spawn_subagent', subtask: parsedArgs.subtask as string } as Action,
          toolCalls,
        };
      }

      return {
        text: content,
        action: { type: 'call_tool', tool: tc.name, args: parsedArgs, toolCallId: message.tool_calls[0].id } as Action,
        toolCalls,
      };
    }

    return { text: content, action: { type: 'done' } };
  }
}