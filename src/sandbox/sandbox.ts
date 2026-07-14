import { ToolDefinition, ActionResult } from '../harness/types.js';

export interface SandboxOptions {
  timeout: number;
}

export class Sandbox {
  constructor(private options: SandboxOptions) {}

  async run(tool: ToolDefinition, args: Record<string, unknown>): Promise<ActionResult> {
    try {
      const result = await Promise.race([
        tool.handler(args),
        new Promise<ActionResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool '${tool.name}' timeout after ${this.options.timeout}ms`)), this.options.timeout)
        ),
      ]);
      return result;
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }
}