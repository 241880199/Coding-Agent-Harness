import { ActionResult } from '../../harness/types.js';
import { execSync } from 'child_process';

export async function bashHandler(args: Record<string, unknown>): Promise<ActionResult> {
  const command = args.command as string;
  if (!command) {
    return { success: false, error: 'Missing required argument: command' };
  }
  try {
    const output = execSync(command, { encoding: 'utf-8', timeout: 30000 });
    return { success: true, data: output };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string };
    return {
      success: false,
      error: err.stderr || err.message,
      data: err.stdout,
    };
  }
}