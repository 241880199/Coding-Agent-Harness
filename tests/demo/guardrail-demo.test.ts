import { describe, it, expect } from 'vitest';
import { Guardrail } from '../../src/governance/guardrail.js';

describe('Demo: Guardrail intercepts dangerous action', () => {
  it('should intercept rm -rf / and provide reason', () => {
    const guardrail = new Guardrail();
    const action = { type: 'call_tool' as const, tool: 'bash' as const, args: { command: 'rm -rf /' } };
    const result = guardrail.allow(action);
    expect(result.allow).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('should allow safe command', () => {
    const guardrail = new Guardrail();
    const action = { type: 'call_tool' as const, tool: 'bash' as const, args: { command: 'echo hello' } };
    const result = guardrail.allow(action);
    expect(result.allow).toBe(true);
  });

  it('should override interception after user confirmation', () => {
    const guardrail = new Guardrail();
    const action = { type: 'call_tool' as const, tool: 'bash' as const, args: { command: 'rm -rf /' } };
    expect(guardrail.allow(action).allow).toBe(false);
    guardrail.override();
    expect(guardrail.allow(action).allow).toBe(true);
  });
});