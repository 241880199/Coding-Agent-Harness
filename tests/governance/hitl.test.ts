import { describe, it, expect, vi } from 'vitest';
import { HITL } from '../../src/governance/hitl.js';

describe('HITL', () => {
  it('should prompt user and return true on confirmation', async () => {
    const mockPrompt = vi.fn().mockResolvedValue('y');
    const hitl = new HITL(mockPrompt);
    const result = await hitl.confirm('rm -rf /');
    expect(result).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith(expect.stringContaining('rm -rf /'));
  });

  it('should return false on rejection', async () => {
    const mockPrompt = vi.fn().mockResolvedValue('n');
    const hitl = new HITL(mockPrompt);
    const result = await hitl.confirm('DROP TABLE');
    expect(result).toBe(false);
  });

  it('should treat empty input as rejection', async () => {
    const mockPrompt = vi.fn().mockResolvedValue('');
    const hitl = new HITL(mockPrompt);
    const result = await hitl.confirm('danger');
    expect(result).toBe(false);
  });
});