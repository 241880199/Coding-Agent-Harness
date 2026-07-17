import { describe, it, expect } from 'vitest';
import { agentLoop } from '../../src/harness/loop.js';
import { MockLLM } from '../../src/llm/mock.js';
import { Guardrail } from '../../src/governance/guardrail.js';
import { HITL } from '../../src/governance/hitl.js';
import { Sandbox } from '../../src/sandbox/sandbox.js';
import { Tracer } from '../../src/observability/tracer.js';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { SessionManager } from '../../src/memory/session.js';
import { KnowledgeManager } from '../../src/memory/knowledge.js';
import { Retriever } from '../../src/memory/retriever.js';
import { SensorRunner } from '../../src/feedback/sensors.js';
import { Harness, ToolDefinition } from '../../src/harness/types.js';

describe('agentLoop', () => {
  function createTestHarness(llm: MockLLM, guardrail?: Guardrail): Harness {
    const tools = new Map<string, ToolDefinition>();
    tools.set('echo', {
      name: 'echo',
      description: 'echo test',
      parameters: { type: 'object', properties: { msg: { type: 'string' } }, required: ['msg'] },
      handler: async (args) => ({ success: true, data: `echo: ${args.msg}` }),
    });

    const g = guardrail || new Guardrail();
    const hitl = new HITL(async () => 'y');
    const sandbox = new Sandbox({ timeout: 5000 });
    const tracer = new Tracer('test-session');
    const db = createMemoryDatabase();
    const sm = new SessionManager(db);
    const km = new KnowledgeManager(db);
    const retriever = new Retriever(km);
    const sensors = new SensorRunner(
      async () => ({ pass: true, details: [] }),
      async () => ({ pass: true, details: [] }),
    );

    return {
      config: {
        project: 'test',
        llmProvider: llm,
        maxSteps: 10,
        maxDepth: 3,
        tokenLimit: 1000,
        ruleFiles: [],
        dataDir: ':memory:',
      },
      systemPrompt: 'You are a test agent',
      rules: [],
      tools,
      mcpTools: new Map(),
      guardrail: { allow: (a) => g.allow(a), override: () => g.override() },
      hooks: [],
      sandbox,
      tracer: tracer as unknown as Harness['tracer'],
      memory: {
        read: () => '',
        write: () => {},
        consolidate: () => {},
      },
      retriever: { retrieve: () => '' },
      skills: new Map(),
    };
  }

  it('should complete a simple done-only flow', async () => {
    const llm = new MockLLM('fixed', { text: 'Done', action: { type: 'done' } });
    const harness = createTestHarness(llm);
    const result = await agentLoop('do nothing', harness);
    expect(result.answer).toBe('Done');
    expect(result.steps).toBe(1);
  });

  it('should execute tools and continue', async () => {
    const llm = new MockLLM('fsm', [
      { text: 'Echoing', action: { type: 'call_tool', tool: 'echo', args: { msg: 'hello' } } },
      { text: 'Done now', action: { type: 'done' } },
    ]);
    const harness = createTestHarness(llm);
    const result = await agentLoop('test echo', harness);
    expect(result.steps).toBe(2);
    expect(result.trace.length).toBe(2);
    expect(result.trace[0].result.data).toContain('hello');
  });

  it('should stop at max steps', async () => {
    const llm = new MockLLM('fixed', { text: 'keep going', action: { type: 'call_tool', tool: 'echo', args: { msg: 'x' } } });
    const harness = createTestHarness(llm);
    const result = await agentLoop('loop forever', { ...harness, config: { ...harness.config, maxSteps: 3 } });
    expect(result.steps).toBe(3);
    expect(result.answer).toContain('max steps');
  });

  it('should block dangerous actions via guardrail', async () => {
    const guardrail = new Guardrail();
    const llm = new MockLLM('fsm', [
      { text: 'rm -rf', action: { type: 'call_tool', tool: 'bash', args: { command: 'rm -rf /' } } },
      { text: 'Done', action: { type: 'done' } },
    ]);
    const harness = createTestHarness(llm, guardrail);
    const result = await agentLoop('delete', harness);
    expect(result.steps).toBeGreaterThanOrEqual(2);
  });

  it('should process take_note actions', async () => {
    let writtenNote = '';
    const llm = new MockLLM('fsm', [
      { text: 'Note taking', action: { type: 'take_note', note: 'Important decision' } },
      { text: 'Done', action: { type: 'done' } },
    ]);
    const harness = createTestHarness(llm);
    (harness.memory as any).write = (note: string) => { writtenNote = note; };
    await agentLoop('take notes', harness);
    expect(writtenNote).toBe('Important decision');
  });

  it('should handle unknown action types', async () => {
    const llm = new MockLLM('fsm', [
      { text: 'unknown', action: { type: 'unknown' as any } },
      { text: 'Done', action: { type: 'done' } },
    ]);
    const harness = createTestHarness(llm);
    const result = await agentLoop('test unknown', harness);
    expect(result.steps).toBe(2);
  });
});