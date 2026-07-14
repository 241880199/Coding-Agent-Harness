import { describe, it, expect, vi } from 'vitest';
import { OpenAIProvider } from '../../src/llm/openai.js';

describe('OpenAIProvider', () => {
  it('should parse a valid LLM response with action', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'I will read the file',
            tool_calls: [{
              function: {
                name: 'read_file',
                arguments: JSON.stringify({ path: 'test.txt' }),
              },
            }],
          },
        }],
      }),
    });
    const provider = new OpenAIProvider('sk-test', 'gpt-4o-mini', mockFetch as unknown as typeof fetch);
    const response = await provider.call(['Read the file']);
    expect(response.text).toBe('I will read the file');
    expect(response.action.type).toBe('call_tool');
    if (response.action.type === 'call_tool') {
      expect(response.action.tool).toBe('read_file');
    }
  });

  it('should return done action when no tool call', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'Task complete',
          },
        }],
      }),
    });
    const provider = new OpenAIProvider('sk-test', 'gpt-4o-mini', mockFetch as unknown as typeof fetch);
    const response = await provider.call(['Do something']);
    expect(response.text).toBe('Task complete');
    expect(response.action.type).toBe('done');
  });

  it('should handle API errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } }),
    });
    const provider = new OpenAIProvider('sk-test', 'gpt-4o-mini', mockFetch as unknown as typeof fetch);
    await expect(provider.call(['test'])).rejects.toThrow('API');
  });
});