import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface KeytarLike {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

interface FileStore {
  apiKey?: string;
  baseUrl?: string;
}

export class CredentialManager {
  private keytar: KeytarLike | null = null;
  private fileStorePath: string;
  private fileStore: FileStore | null = null;

  constructor(
    private serviceName: string = 'coding-agent-harness',
    keytarImpl?: KeytarLike,
    fileStorePath?: string,
  ) {
    this.keytar = keytarImpl || null;
    this.fileStorePath = fileStorePath || path.join(os.homedir(), '.harness', 'config.json');
  }

  private async ensureKeytar(): Promise<KeytarLike> {
    if (this.keytar) return this.keytar;
    try {
      const kt = await import('keytar');
      this.keytar = kt.default || kt;
      return this.keytar;
    } catch {
      throw new Error('keytar not available');
    }
  }

  private loadFileStore(): FileStore {
    if (this.fileStore) return this.fileStore;
    try {
      if (fs.existsSync(this.fileStorePath)) {
        const data: FileStore = JSON.parse(fs.readFileSync(this.fileStorePath, 'utf-8'));
        this.fileStore = data;
      } else {
        this.fileStore = {};
      }
    } catch {
      this.fileStore = {};
    }
    return this.fileStore!;
  }

  private saveFileStore(): void {
    const dir = path.dirname(this.fileStorePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.fileStorePath, JSON.stringify(this.fileStore, null, 2), { mode: 0o600 });
  }

  async setKey(key: string): Promise<void> {
    try {
      const kt = await this.ensureKeytar();
      await kt.setPassword(this.serviceName, 'api-key', key);
    } catch {
      const store = this.loadFileStore();
      store.apiKey = key;
      this.saveFileStore();
    }
  }

  async getKey(): Promise<string | null> {
    if (process.env['HARNESS_API_KEY']) {
      return process.env['HARNESS_API_KEY']!;
    }
    try {
      const kt = await this.ensureKeytar();
      return await kt.getPassword(this.serviceName, 'api-key');
    } catch {
      const store = this.loadFileStore();
      return store.apiKey || null;
    }
  }

  async setBaseUrl(url: string): Promise<void> {
    try {
      const kt = await this.ensureKeytar();
      await kt.setPassword(this.serviceName, 'base-url', url);
    } catch {
      const store = this.loadFileStore();
      store.baseUrl = url;
      this.saveFileStore();
    }
  }

  async getBaseUrl(): Promise<string | null> {
    if (process.env['HARNESS_BASE_URL']) {
      return process.env['HARNESS_BASE_URL']!;
    }
    try {
      const kt = await this.ensureKeytar();
      return await kt.getPassword(this.serviceName, 'base-url');
    } catch {
      const store = this.loadFileStore();
      return store.baseUrl || null;
    }
  }

  async clearBaseUrl(): Promise<void> {
    try {
      const kt = await this.ensureKeytar();
      await kt.deletePassword(this.serviceName, 'base-url');
    } catch {
      const store = this.loadFileStore();
      delete store.baseUrl;
      this.saveFileStore();
    }
  }

  async viewStatus(): Promise<string> {
    const key = await this.getKey();
    if (key) {
      return `API Key: configured (stored in: ${this.keytar ? 'system keychain' : '~/.harness/config.json'})`;
    }
    return 'API Key: not configured';
  }

  async viewBaseUrl(): Promise<string> {
    const url = await this.getBaseUrl();
    if (url) {
      return `Base URL: ${url}`;
    }
    return 'Base URL: not configured (default: https://api.openai.com/v1)';
  }

  async clearKey(): Promise<void> {
    try {
      const kt = await this.ensureKeytar();
      await kt.deletePassword(this.serviceName, 'api-key');
    } catch {
      const store = this.loadFileStore();
      delete store.apiKey;
      this.saveFileStore();
    }
  }
}