import { describe, it, expect } from 'vitest';
import { Sandbox } from '../../src/sandbox/sandbox.js';
import { ToolDefinition } from '../../src/harness/types.js';

describe('Sandbox', () => {
  it('should execute a tool handler and return result', async () => {
    const sandbox = new Sandbox({ timeout: 5000 });
    const tool: ToolDefinition = {
      name: 'echo',
      description: 'echo test',
      handler: async () => ({ success: true, data: 'echoed' }),
    };
    const result = await sandbox.run(tool, { msg: 'hello' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('echoed');
  });

  it('should timeout long-running tools', async () => {
    const sandbox = new Sandbox({ timeout: 100 });
    const tool: ToolDefinition = {
      name: 'slow',
      description: 'slow tool',
      handler: async () => {
        await new Promise(r => setTimeout(r, 1000));
        return { success: true, data: 'done' };
      },
    };
    const result = await sandbox.run(tool, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('should catch handler errors', async () => {
    const sandbox = new Sandbox({ timeout: 5000 });
    const tool: ToolDefinition = {
      name: 'crash',
      description: 'crash tool',
      handler: async () => { throw new Error('handler crash'); },
    };
    const result = await sandbox.run(tool, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('handler crash');
  });
});