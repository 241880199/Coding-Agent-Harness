import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CredentialManager } from '../../src/config/credential.js';

describe('CredentialManager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should set and get a key using keytar', async () => {
    const mockKeytar = {
      setPassword: vi.fn().mockResolvedValue(undefined),
      getPassword: vi.fn().mockResolvedValue('sk-test-key'),
      deletePassword: vi.fn().mockResolvedValue(true),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    await mgr.setKey('sk-test-key');
    const key = await mgr.getKey();
    expect(key).toBe('sk-test-key');
    expect(mockKeytar.setPassword).toHaveBeenCalledWith('test-service', 'api-key', 'sk-test-key');
  });

  it('should return null when no key is set', async () => {
    const mockKeytar = {
      setPassword: vi.fn(),
      getPassword: vi.fn().mockResolvedValue(null),
      deletePassword: vi.fn(),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    const key = await mgr.getKey();
    expect(key).toBeNull();
  });

  it('should view status without revealing key', async () => {
    const mockKeytar = {
      setPassword: vi.fn(),
      getPassword: vi.fn().mockResolvedValue('sk-test-key'),
      deletePassword: vi.fn(),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    const status = await mgr.viewStatus();
    expect(status).toContain('configured');
    expect(status).not.toContain('sk-test-key');
  });

  it('should clear a key', async () => {
    const mockKeytar = {
      setPassword: vi.fn(),
      getPassword: vi.fn(),
      deletePassword: vi.fn().mockResolvedValue(true),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    await mgr.clearKey();
    expect(mockKeytar.deletePassword).toHaveBeenCalledWith('test-service', 'api-key');
  });
});