import { describe, it, expect } from 'vitest';
import { buildContext, compact } from '../../src/harness/context.js';
import { Message } from '../../src/harness/types.js';

describe('buildContext', () => {
  it('should assemble system prompt, rules, memory, goal', () => {
    const context = buildContext(
      'fix the bug',
      'You are a coding agent',
      ['Rule: use TDD'],
      '[decision] Use SQLite',
      '',
    );
    expect(context.length).toBe(2);
    expect(context[0].role).toBe('system');
    expect(context[0].content).toContain('coding agent');
    expect(context[0].content).toContain('TDD');
    expect(context[0].content).toContain('SQLite');
    expect(context[1].role).toBe('user');
    expect(context[1].content).toContain('fix the bug');
  });

  it('should skip empty sections', () => {
    const context = buildContext('do it', 'You are an agent', [], '', '');
    expect(context.length).toBe(2);
    expect(context[0].role).toBe('system');
    expect(context[1].role).toBe('user');
  });
});

describe('compact', () => {
  it('should keep context under token limit', () => {
    const long: Message[] = Array.from({ length: 100 }, (_, i) => ({ role: 'user' as const, content: `line ${i} with some content to fill tokens` }));
    const result = compact(long, 50);
    expect(result.length).toBeLessThanOrEqual(51);
  });

  it('should keep the last N messages', () => {
    const msgs: Message[] = [
      'first message with enough content',
      'second message with enough content',
      'third message with enough content',
      'fourth message with enough content',
      'fifth message with enough content',
    ].map(c => ({ role: 'user' as const, content: c }));
    const result = compact(msgs, 40);
    expect(result.some(m => m.content === 'fifth message with enough content')).toBe(true);
    expect(result.some(m => m.content === 'first message with enough content')).toBe(false);
  });
});