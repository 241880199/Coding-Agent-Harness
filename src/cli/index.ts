export interface ParsedArgs {
  command: string;
  goal?: string;
  subcommand?: string;
  sessionId?: string;
  projectName?: string;
  maxSteps?: number;
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) return { command: 'repl' };

  let maxSteps: number | undefined;
  const flags: string[] = [];
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--max-steps' && argv[i + 1]) {
      maxSteps = parseInt(argv[i + 1], 10) || undefined;
      i++;
    } else {
      positional.push(argv[i]);
    }
  }

  const cmd = positional[0];

  if (cmd === 'start' && positional[1]) {
    return { command: 'start', goal: positional.slice(1).join(' '), maxSteps };
  }

  if (cmd === 'config' && positional[1]) {
    return { command: 'config', subcommand: positional[1] };
  }

  if (cmd === 'trace' && positional[1]) {
    return { command: 'trace', sessionId: positional[1] };
  }

  if (cmd === 'init' && positional[1]) {
    return { command: 'init', projectName: positional[1] };
  }

  return { command: 'help' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case 'repl': {
      const { replCommand } = await import('./repl.js');
      await replCommand(args.maxSteps);
      break;
    }
    case 'start': {
      const { startCommand } = await import('./start.js');
      await startCommand(args.goal!, args.maxSteps);
      break;
    }
    case 'config': {
      const { configCommand } = await import('./config.js');
      await configCommand(args.subcommand!);
      break;
    }
    case 'trace': {
      const { traceCommand } = await import('./trace.js');
      await traceCommand(args.sessionId!);
      break;
    }
    case 'init': {
      const { initCommand } = await import('./init.js');
      await initCommand(args.projectName!);
      break;
    }
    default:
      console.log(`Usage:
  harness                        Start interactive REPL mode
  harness start <goal>           Run a single coding task
  harness start --max-steps N    Set max steps (default: 200)
  harness config set-key         Set API key (hidden input)
  harness config view-key        View key status (no plaintext)
  harness config clear-key       Clear stored API key
  harness config set-url         Set LLM provider Base URL
  harness config view-url        View current Base URL
  harness config clear-url       Clear Base URL (use default)
  harness trace <session>        View trace for a session
  harness init <project>         Initialize a new project`);
  }
}

main().catch(console.error);