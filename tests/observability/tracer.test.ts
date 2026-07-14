import { describe, it, expect } from 'vitest';
import { Tracer } from '../../src/observability/tracer.js';

describe('Tracer', () => {
  it('should record and retrieve entries', () => {
    const tracer = new Tracer('session-1');
    tracer.record(
      { type: 'call_tool', tool: 'read_file', args: { path: 'test.txt' } },
      { success: true, data: 'content' },
    );
    const entries = tracer.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].step).toBe(1);
    expect(entries[0].action.tool).toBe('read_file');
  });

  it('should increment step numbers', () => {
    const tracer = new Tracer('session-1');
    tracer.record({ type: 'done' }, { success: true, data: 'ok' });
    tracer.record({ type: 'done' }, { success: true, data: 'ok' });
    const entries = tracer.getEntries();
    expect(entries[0].step).toBe(1);
    expect(entries[1].step).toBe(2);
  });

  it('should export to JSON', () => {
    const tracer = new Tracer('session-1');
    tracer.record({ type: 'done' }, { success: true, data: 'ok' });
    const json = tracer.exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.sessionId).toBe('session-1');
    expect(parsed.entries.length).toBe(1);
  });

  it('should flush and clear entries', () => {
    const tracer = new Tracer('session-1');
    tracer.record({ type: 'done' }, { success: true, data: 'ok' });
    const flushed = tracer.flush();
    expect(flushed.length).toBe(1);
    expect(tracer.getEntries().length).toBe(0);
  });
});