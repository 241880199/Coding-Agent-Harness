export interface ParsedArgs {
  command: string;
  goal?: string;
  subcommand?: string;
  sessionId?: string;
  projectName?: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) return { command: 'repl' };

  const cmd = argv[0];

  if (cmd === 'start' && argv[1]) {
    return { command: 'start', goal: argv.slice(1).join(' ') };
  }

  if (cmd === 'config' && argv[1]) {
    return { command: 'config', subcommand: argv[1] };
  }

  if (cmd === 'trace' && argv[1]) {
    return { command: 'trace', sessionId: argv[1] };
  }

  if (cmd === 'init' && argv[1]) {
    return { command: 'init', projectName: argv[1] };
  }

  return { command: 'help' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case 'repl': {
      const { replCommand } = await import('./repl.js');
      await replCommand();
      break;
    }
    case 'start': {
      const { startCommand } = await import('./start.js');
      await startCommand(args.goal!);
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
  harness                      Start interactive REPL mode
  harness start <goal>         Run a single coding task
  harness config set-key       Set API key (hidden input)
  harness config view-key      View key status (no plaintext)
  harness config clear-key     Clear stored API key
  harness trace <session>      View trace for a session
  harness init <project>       Initialize a new project`);
  }
}

main().catch(console.error);