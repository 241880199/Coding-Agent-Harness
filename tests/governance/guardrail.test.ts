import { describe, it, expect } from 'vitest';
import { Guardrail } from '../../src/governance/guardrail.js';

describe('Guardrail', () => {
  const guardrail = new Guardrail();

  it('should allow safe commands', () => {
    const result = guardrail.allow({ type: 'call_tool', tool: 'bash', args: { command: 'echo hello' } });
    expect(result.allow).toBe(true);
  });

  it('should block rm -rf root', () => {
    const result = guardrail.allow({ type: 'call_tool', tool: 'bash', args: { command: 'rm -rf /' } });
    expect(result.allow).toBe(false);
    expect(result.reason).toContain('rm -rf');
  });

  it('should block DROP TABLE', () => {
    const result = guardrail.allow({ type: 'call_tool', tool: 'bash', args: { command: 'DROP TABLE users' } });
    expect(result.allow).toBe(false);
  });

  it('should block git push --force', () => {
    const result = guardrail.allow({ type: 'call_tool', tool: 'bash', args: { command: 'git push --force origin main' } });
    expect(result.allow).toBe(false);
  });

  it('should allow non-bash actions', () => {
    const result = guardrail.allow({ type: 'call_tool', tool: 'read_file', args: { path: 'test.txt' } });
    expect(result.allow).toBe(true);
  });

  it('should allow override after user confirmation', () => {
    const result = guardrail.allow({ type: 'call_tool', tool: 'bash', args: { command: 'rm -rf /' } });
    expect(result.allow).toBe(false);
    guardrail.override();
    const afterOverride = guardrail.allow({ type: 'call_tool', tool: 'bash', args: { command: 'rm -rf /' } });
    expect(afterOverride.allow).toBe(true);
  });

  it('should allow adding custom patterns', () => {
    const g = new Guardrail(['format C:']);
    const result = g.allow({ type: 'call_tool', tool: 'bash', args: { command: 'format C:' } });
    expect(result.allow).toBe(false);
  });
});