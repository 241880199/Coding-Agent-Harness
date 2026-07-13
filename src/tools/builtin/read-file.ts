import { ActionResult } from '../../harness/types.js';
import fs from 'fs';

export async function readFileHandler(args: Record<string, unknown>): Promise<ActionResult> {
  const filePath = args.path as string;
  if (!filePath) {
    return { success: false, error: 'Missing required argument: path' };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data: content };
  } catch (e) {
    return { success: false, error: `Failed to read file: ${(e as Error).message}` };
  }
}