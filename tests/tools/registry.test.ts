import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../src/tools/registry.js';

describe('ToolRegistry', () => {
  it('should register and list tools', () => {
    const registry = new ToolRegistry();
    registry.register({ name: 'test_tool', description: 'A test tool', handler: async () => ({ success: true, data: 'ok' }) });
    const list = registry.list();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('test_tool');
  });

  it('should get a registered tool by name', () => {
    const registry = new ToolRegistry();
    registry.register({ name: 'my_tool', description: 'desc', handler: async () => ({ success: true, data: 'ok' }) });
    const tool = registry.get('my_tool');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('my_tool');
  });

  it('should return undefined for unknown tool', () => {
    const registry = new ToolRegistry();
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('should throw on duplicate registration', () => {
    const registry = new ToolRegistry();
    registry.register({ name: 'dup', description: 'd1', handler: async () => ({ success: true, data: 'ok' }) });
    expect(() => registry.register({ name: 'dup', description: 'd2', handler: async () => ({ success: true, data: 'ok' }) })).toThrow();
  });
});