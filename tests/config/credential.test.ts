import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CredentialManager } from '../../src/config/credential.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

  it('should set and get a base URL', async () => {
    const mockKeytar = {
      setPassword: vi.fn().mockResolvedValue(undefined),
      getPassword: vi.fn().mockResolvedValue('https://api.deepseek.com/v1'),
      deletePassword: vi.fn().mockResolvedValue(true),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    await mgr.setBaseUrl('https://api.deepseek.com/v1');
    const url = await mgr.getBaseUrl();
    expect(url).toBe('https://api.deepseek.com/v1');
    expect(mockKeytar.setPassword).toHaveBeenCalledWith('test-service', 'base-url', 'https://api.deepseek.com/v1');
  });

  it('should return null for base URL when not configured', async () => {
    const mockKeytar = {
      setPassword: vi.fn(),
      getPassword: vi.fn().mockResolvedValue(null),
      deletePassword: vi.fn(),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    const url = await mgr.getBaseUrl();
    expect(url).toBeNull();
  });

  it('should view base URL status without error', async () => {
    const mockKeytar = {
      setPassword: vi.fn(),
      getPassword: vi.fn().mockResolvedValue('https://api.openai.com/v1'),
      deletePassword: vi.fn(),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    const status = await mgr.viewBaseUrl();
    expect(status).toContain('https://api.openai.com/v1');
  });

  it('should clear base URL', async () => {
    const mockKeytar = {
      setPassword: vi.fn(),
      getPassword: vi.fn(),
      deletePassword: vi.fn().mockResolvedValue(true),
    };
    const mgr = new CredentialManager('test-service', mockKeytar as any);
    await mgr.clearBaseUrl();
    expect(mockKeytar.deletePassword).toHaveBeenCalledWith('test-service', 'base-url');
  });
});

describe('CredentialManager (file-based fallback)', () => {
  let tmpDir: string;
  let configPath: string;

  function mockKeytarThatThrows() {
    return {
      setPassword: vi.fn().mockRejectedValue(new Error('keychain unavailable')),
      getPassword: vi.fn().mockRejectedValue(new Error('keychain unavailable')),
      deletePassword: vi.fn().mockRejectedValue(new Error('keychain unavailable')),
    };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should set and get key via file store', async () => {
    const mgr = new CredentialManager('test-service', mockKeytarThatThrows() as any, configPath);
    await mgr.setKey('sk-file-key');
    const key = await mgr.getKey();
    expect(key).toBe('sk-file-key');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should set and get base URL via file store', async () => {
    const mgr = new CredentialManager('test-service', mockKeytarThatThrows() as any, configPath);
    await mgr.setBaseUrl('https://deepseek.com/v1');
    const url = await mgr.getBaseUrl();
    expect(url).toBe('https://deepseek.com/v1');
  });

  it('should persist across different instances', async () => {
    const mgr1 = new CredentialManager('test-service', mockKeytarThatThrows() as any, configPath);
    await mgr1.setKey('sk-persist');
    await mgr1.setBaseUrl('https://openai.com/v1');

    const mgr2 = new CredentialManager('test-service', mockKeytarThatThrows() as any, configPath);
    expect(await mgr2.getKey()).toBe('sk-persist');
    expect(await mgr2.getBaseUrl()).toBe('https://openai.com/v1');
  });

  it('should clear key and base URL', async () => {
    const mgr = new CredentialManager('test-service', mockKeytarThatThrows() as any, configPath);
    await mgr.setKey('sk-clear');
    await mgr.setBaseUrl('https://v1.com');
    await mgr.clearKey();
    await mgr.clearBaseUrl();
    expect(await mgr.getKey()).toBeNull();
    expect(await mgr.getBaseUrl()).toBeNull();
  });

  it('should report correct storage location', async () => {
    const mgr = new CredentialManager('test-service', mockKeytarThatThrows() as any, configPath);
    await mgr.setKey('sk-xyz');
    const status = await mgr.viewStatus();
    expect(status).toContain('configured');
  });
});