import { describe, it, expect } from 'vitest';
import { writeFileHandler } from '../../../src/tools/builtin/write-file.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('writeFileHandler', () => {
  it('should write content to a file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
    const filePath = path.join(tmpDir, 'output.txt');
    const result = await writeFileHandler({ path: filePath, content: 'new content' });
    expect(result.success).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should create intermediate directories', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
    const filePath = path.join(tmpDir, 'sub', 'dir', 'nested.txt');
    const result = await writeFileHandler({ path: filePath, content: 'nested' });
    expect(result.success).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('nested');
    fs.rmSync(tmpDir, { recursive: true });
  });
});