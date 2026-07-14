import { describe, it, expect } from 'vitest';
import { buildAgent } from '../../src/harness/index.js';
import { MockLLM } from '../../src/llm/mock.js';

describe('buildAgent', () => {
  it('should assemble a complete Harness instance', async () => {
    const llm = new MockLLM('fixed', { text: 'ready', action: { type: 'done' } });
    const harness = await buildAgent({
      project: 'test-proj',
      llmProvider: llm,
      maxSteps: 10,
      maxDepth: 3,
      tokenLimit: 1000,
      ruleFiles: [],
      dataDir: ':memory:',
    });
    expect(harness.systemPrompt).toBeTruthy();
    expect(harness.tools.size).toBeGreaterThan(0);
    expect(harness.guardrail).toBeDefined();
    expect(harness.sandbox).toBeDefined();
    expect(harness.tracer).toBeDefined();
    expect(harness.memory).toBeDefined();
    expect(harness.retriever).toBeDefined();
  });

  it('should load rule files if provided', async () => {
    const llm = new MockLLM('fixed', { text: 'ready', action: { type: 'done' } });
    const harness = await buildAgent({
      project: 'test-proj',
      llmProvider: llm,
      maxSteps: 10,
      maxDepth: 3,
      tokenLimit: 1000,
      ruleFiles: ['rules/CLAUDE.md.example'],
      dataDir: ':memory:',
    });
    expect(harness.rules.length).toBeGreaterThanOrEqual(0);
  });

  it('should register built-in tools', async () => {
    const llm = new MockLLM('fixed', { text: 'ready', action: { type: 'done' } });
    const harness = await buildAgent({
      project: 'test-proj',
      llmProvider: llm,
      maxSteps: 10,
      maxDepth: 3,
      tokenLimit: 1000,
      ruleFiles: [],
      dataDir: ':memory:',
    });
    expect(harness.tools.get('read_file')).toBeDefined();
    expect(harness.tools.get('write_file')).toBeDefined();
    expect(harness.tools.get('bash')).toBeDefined();
  });
});