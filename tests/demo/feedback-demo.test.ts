import { describe, it, expect } from 'vitest';
import { SensorRunner } from '../../src/feedback/sensors.js';
import { MockLLM } from '../../src/llm/mock.js';
import { Message } from '../../src/harness/types.js';

function msg(content: string): Message {
  return { role: 'user', content };
}

describe('Demo: Feedback loop changes agent behavior', () => {
  it('should inject failure and agent should change next action', async () => {
    const mockLLM = new MockLLM('fsm', [
      { text: 'Writing code', action: { type: 'call_tool', tool: 'write_file', args: { path: 'bug.ts', content: 'bad code' }, changed_code: true } },
      { text: 'Fixing code', action: { type: 'call_tool', tool: 'write_file', args: { path: 'bug.ts', content: 'fixed code' } } },
    ]);

    const r1 = await mockLLM.call([msg('write code')]);
    expect(r1.action.type).toBe('call_tool');
    if (r1.action.type === 'call_tool') {
      expect(r1.action.tool).toBe('write_file');
    }

    const sensorRunner = new SensorRunner(
      async () => ({ pass: false, details: [{ test: 'bug-test', status: 'fail', message: 'Expected true, got false' }] }),
      async () => ({ pass: true, details: [] }),
    );
    const report = await sensorRunner.runAll();
    expect(report.pass).toBe(false);

    const r2 = await mockLLM.call([msg('write code'), msg('test_failed: Expected true, got false')]);
    expect(r2.action.type).toBe('call_tool');
  });
});