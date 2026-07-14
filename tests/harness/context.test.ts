import { describe, it, expect } from 'vitest';
import { buildContext, compact } from '../../src/harness/context.js';

describe('buildContext', () => {
  it('should assemble system prompt, rules, memory, goal', () => {
    const context = buildContext(
      'fix the bug',
      'You are a coding agent',
      ['Rule: use TDD'],
      '[decision] Use SQLite',
      '',
    );
    expect(context.length).toBe(4);
    expect(context[0]).toContain('coding agent');
    expect(context[1]).toContain('TDD');
    expect(context[2]).toContain('SQLite');
    expect(context[3]).toContain('fix the bug');
  });

  it('should skip empty sections', () => {
    const context = buildContext('do it', 'You are an agent', [], '', '');
    expect(context.length).toBe(2);
  });
});

describe('compact', () => {
  it('should keep context under token limit', () => {
    const long = Array.from({ length: 100 }, (_, i) => `line ${i} with some content to fill tokens`);
    const result = compact(long, 50);
    expect(result.length).toBeLessThan(50);
  });

  it('should keep the last N messages', () => {
    const msgs = ['first', 'second', 'third', 'fourth', 'fifth'];
    const result = compact(msgs, 3);
    expect(result).toContain('fifth');
    expect(result).not.toContain('first');
  });
});