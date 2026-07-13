import { ActionResult } from '../../harness/types.js';
import fs from 'fs';
import path from 'path';

export async function writeFileHandler(args: Record<string, unknown>): Promise<ActionResult> {
  const filePath = args.path as string;
  const content = args.content as string;
  if (!filePath) {
    return { success: false, error: 'Missing required argument: path' };
  }
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content ?? '', 'utf-8');
    return { success: true, data: `Written ${(content ?? '').length} bytes to ${filePath}` };
  } catch (e) {
    return { success: false, error: `Failed to write file: ${(e as Error).message}` };
  }
}