import { Action, GuardrailResult } from '../harness/types.js';

const DEFAULT_DANGEROUS_PATTERNS = [
  'rm -rf /',
  'rm -rf ~',
  'DROP TABLE',
  'DROP DATABASE',
  'git push --force',
  'format C:',
  'del /f /s /q',
  'rd /s /q',
];

export class Guardrail {
  private dangerousPatterns: string[];
  private overridden: boolean = false;

  constructor(extraPatterns: string[] = []) {
    this.dangerousPatterns = [...DEFAULT_DANGEROUS_PATTERNS, ...extraPatterns];
  }

  allow(action: Action): GuardrailResult {
    if (action.type !== 'call_tool' || action.tool !== 'bash') {
      return { allow: true };
    }
    if (this.overridden) {
      return { allow: true };
    }
    const command = (action.args.command as string) || '';
    for (const pattern of this.dangerousPatterns) {
      if (command.toLowerCase().includes(pattern.toLowerCase())) {
        return { allow: false, reason: `Dangerous command pattern detected: ${pattern}` };
      }
    }
    return { allow: true };
  }

  override(): void {
    this.overridden = true;
  }

  resetOverride(): void {
    this.overridden = false;
  }
}