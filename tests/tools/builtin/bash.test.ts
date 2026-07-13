import { describe, it, expect } from 'vitest';
import { bashHandler } from '../../../src/tools/builtin/bash.js';

describe('bashHandler', () => {
  it('should execute a command and return output', async () => {
    const result = await bashHandler({ command: 'echo hello' });
    expect(result.success).toBe(true);
    expect(result.data).toContain('hello');
  });

  it('should return error for non-existent command', async () => {
    const result = await bashHandler({ command: 'nonexistent_command_xyz' });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});