import { describe, it, expect } from 'vitest';
import { readFileHandler } from '../../../src/tools/builtin/read-file.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('readFileHandler', () => {
  it('should read a file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
    const filePath = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(filePath, 'hello world');
    const result = await readFileHandler({ path: filePath });
    expect(result.success).toBe(true);
    expect(result.data).toBe('hello world');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should return error for non-existent file', async () => {
    const result = await readFileHandler({ path: '/nonexistent/file.txt' });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});