import { describe, it, expect } from 'vitest';
import type {
  Action,
  ActionResult,
  LLMResponse,
  GuardrailResult,
  SensorReport,
  MemoryEntry,
  TraceEntry,
} from '../../src/harness/types.js';

describe('Action type', () => {
  it('should create a call_tool action', () => {
    const action: Action = {
      type: 'call_tool',
      tool: 'read_file',
      args: { path: 'test.txt' },
    };
    expect(action.type).toBe('call_tool');
    expect(action.tool).toBe('read_file');
  });

  it('should create a done action', () => {
    const action: Action = { type: 'done' };
    expect(action.type).toBe('done');
  });

  it('should create a take_note action', () => {
    const action: Action = {
      type: 'take_note',
      note: 'Important decision: use SQLite',
    };
    expect(action.type).toBe('take_note');
    expect(action.note).toBe('Important decision: use SQLite');
  });

  it('should create a use_skill action', () => {
    const action: Action = {
      type: 'use_skill',
      name: 'test-driven-development',
    };
    expect(action.type).toBe('use_skill');
  });

  it('should create a spawn_subagent action', () => {
    const action: Action = {
      type: 'spawn_subagent',
      subtask: 'fix lint errors',
      scope: ['src/'],
    };
    expect(action.type).toBe('spawn_subagent');
  });
});

describe('ActionResult', () => {
  it('should store success result', () => {
    const result: ActionResult = { success: true, data: 'file content' };
    expect(result.success).toBe(true);
    expect(result.data).toBe('file content');
  });

  it('should store error result', () => {
    const result: ActionResult = { success: false, error: 'File not found' };
    expect(result.success).toBe(false);
    expect(result.error).toBe('File not found');
  });
});

describe('LLMResponse', () => {
  it('should store text and optional action', () => {
    const response: LLMResponse = {
      text: 'I will read the file',
      action: { type: 'call_tool', tool: 'read_file', args: { path: 'test.txt' } },
    };
    expect(response.text).toBe('I will read the file');
    expect(response.action).toBeDefined();
  });
});

describe('GuardrailResult', () => {
  it('should default to allowed', () => {
    const result: GuardrailResult = { allow: true };
    expect(result.allow).toBe(true);
  });

  it('should store rejection reason', () => {
    const result: GuardrailResult = { allow: false, reason: 'Dangerous command' };
    expect(result.allow).toBe(false);
    expect(result.reason).toBe('Dangerous command');
  });
});

describe('SensorReport', () => {
  it('should store pass/fail with details', () => {
    const report: SensorReport = {
      pass: false,
      details: [
        { test: 'should pass', status: 'fail', message: 'Expected true, got false' },
      ],
    };
    expect(report.pass).toBe(false);
    expect(report.details[0].status).toBe('fail');
  });
});

describe('MemoryEntry', () => {
  it('should store project knowledge', () => {
    const entry: MemoryEntry = {
      project: 'my-app',
      category: 'decision',
      content: 'Use SQLite for storage',
    };
    expect(entry.project).toBe('my-app');
    expect(entry.category).toBe('decision');
  });
});

describe('TraceEntry', () => {
  it('should store step trace', () => {
    const entry: TraceEntry = {
      step: 1,
      action: { type: 'call_tool', tool: 'read_file', args: { path: 'test.txt' } },
      result: { success: true, data: 'content' },
    };
    expect(entry.step).toBe(1);
    expect(entry.action.type).toBe('call_tool');
  });
});