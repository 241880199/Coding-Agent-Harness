import * as crypto from 'crypto';

interface KeytarLike {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export class CredentialManager {
  private keytar: KeytarLike | null = null;

  constructor(
    private serviceName: string = 'coding-agent-harness',
    keytarImpl?: KeytarLike,
  ) {
    this.keytar = keytarImpl || null;
  }

  private async ensureKeytar(): Promise<KeytarLike> {
    if (this.keytar) return this.keytar;
    try {
      const kt = await import('keytar');
      this.keytar = kt.default || kt;
      return this.keytar;
    } catch {
      throw new Error('keytar not available. Install keytar or use HARNESS_API_KEY environment variable.');
    }
  }

  async setKey(key: string): Promise<void> {
    const kt = await this.ensureKeytar();
    await kt.setPassword(this.serviceName, 'api-key', key);
  }

  async getKey(): Promise<string | null> {
    try {
      if (process.env['HARNESS_API_KEY']) {
        return process.env['HARNESS_API_KEY']!;
      }
      const kt = await this.ensureKeytar();
      return await kt.getPassword(this.serviceName, 'api-key');
    } catch {
      return process.env['HARNESS_API_KEY'] || null;
    }
  }

  async viewStatus(): Promise<string> {
    const key = await this.getKey();
    if (key) {
      return `API Key: configured (stored in: ${this.keytar ? 'system keychain' : 'environment variable'})`;
    }
    return 'API Key: not configured';
  }

  async clearKey(): Promise<void> {
    try {
      const kt = await this.ensureKeytar();
      await kt.deletePassword(this.serviceName, 'api-key');
    } catch {
      throw new Error('Failed to clear key from keychain');
    }
  }
}