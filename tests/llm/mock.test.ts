import { describe, it, expect } from 'vitest';
import { MockLLM } from '../../src/llm/mock.js';

describe('MockLLM - fixed response mode', () => {
  it('should return preset response', async () => {
    const mock = new MockLLM('fixed', {
      text: 'Reading file',
      action: { type: 'call_tool', tool: 'read_file', args: { path: 'test.txt' } },
    });
    const response = await mock.call(['context']);
    expect(response.text).toBe('Reading file');
    expect(response.action.type).toBe('call_tool');
  });

  it('should always return the same response', async () => {
    const mock = new MockLLM('fixed', {
      text: 'Done',
      action: { type: 'done' },
    });
    const r1 = await mock.call(['ctx1']);
    const r2 = await mock.call(['ctx2']);
    expect(r1.text).toBe('Done');
    expect(r2.text).toBe('Done');
  });
});

describe('MockLLM - FSM mode', () => {
  it('should cycle through preset responses', async () => {
    const mock = new MockLLM('fsm', [
      { text: 'Step 1', action: { type: 'call_tool', tool: 'read_file', args: { path: 'a.txt' } } },
      { text: 'Step 2', action: { type: 'call_tool', tool: 'write_file', args: { path: 'b.txt', content: 'data' } } },
      { text: 'Done', action: { type: 'done' } },
    ]);
    const r1 = await mock.call(['ctx']);
    expect(r1.text).toBe('Step 1');
    expect(r1.action.tool).toBe('read_file');
    const r2 = await mock.call(['ctx']);
    expect(r2.text).toBe('Step 2');
    expect(r2.action.tool).toBe('write_file');
    const r3 = await mock.call(['ctx']);
    expect(r3.text).toBe('Done');
    expect(r3.action.type).toBe('done');
  });

  it('should throw on extra calls after FSM exhausted', async () => {
    const mock = new MockLLM('fsm', [
      { text: 'Only', action: { type: 'done' } },
    ]);
    await mock.call(['ctx']);
    await expect(mock.call(['ctx'])).rejects.toThrow('FSM exhausted');
  });
});

describe('MockLLM - context-aware mode', () => {
  it('should return different responses based on context content', async () => {
    const mock = new MockLLM('context-aware', [
      { match: (ctx: string[]) => ctx.some(c => c.includes('test_failed')),
        response: { text: 'Fixing', action: { type: 'call_tool', tool: 'write_file', args: { path: 'fix.ts', content: 'fixed' } } } },
      { match: (ctx: string[]) => true,
        response: { text: 'Done', action: { type: 'done' } } },
    ]);
    const r1 = await mock.call(['test_failed: assertion error']);
    expect(r1.text).toBe('Fixing');
    const r2 = await mock.call(['all good']);
    expect(r2.text).toBe('Done');
  });
});