import * as readline from 'readline';
import { buildAgent } from '../harness/index.js';
import { agentLoop, LoopResult } from '../harness/loop.js';
import { CredentialManager } from '../config/credential.js';
import { OpenAIProvider } from '../llm/openai.js';
import { Harness } from '../harness/types.js';
import fs from 'fs';

export async function replCommand(): Promise<void> {
  const credMgr = new CredentialManager();
  let apiKey = await credMgr.getKey();

  if (!apiKey) {
    console.log('\n========================================');
    console.log('  Welcome to Coding Agent Harness!');
    console.log('========================================');
    console.log('\n  API Key not configured yet.');
    console.log('  Please set your API key to get started:\n');
    console.log('    harness config set-key');
    console.log('\n  Or use environment variable:');
    console.log('    set HARNESS_API_KEY=sk-...\n');
    process.exit(0);
  }

  console.log('\n========================================');
  console.log('  Coding Agent Harness - Interactive');
  console.log('========================================');
  console.log('  Type your goal in natural language.');
  console.log('  Commands: /new-session  /help  /exit');
  console.log('========================================\n');

  const project = process.cwd().split(/[/\\]/).pop() || 'default';
  let harness = await createHarness(project, apiKey);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n> ',
  });

  console.log(`[Session] Project: ${project}\n`);
  rl.prompt();

  rl.on('line', async (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(/\s+/);
      const action = parts[0].toLowerCase();

      switch (action) {
        case '/new-session':
          console.log('[Session] Starting new session...\n');
          harness = await createHarness(project, apiKey);
          rl.prompt();
          return;

        case '/exit':
        case '/quit':
          rl.close();
          return;

        case '/help':
          console.log(`
Available commands:
  /new-session    Start a new agent session
  /help           Show this help
  /exit, /quit    Exit the harness

Type any natural language goal to have the agent work on it.
Examples:
  Fix the type errors in src/utils.ts
  Add unit tests for the auth module
  Explain the architecture of this project
`);
          rl.prompt();
          return;

        default:
          console.log(`Unknown command: ${action}. Type /help for available commands.`);
          rl.prompt();
          return;
      }
    }

    console.log(`[Running] ${trimmed}`);
    try {
      const result = await agentLoop(trimmed, harness);
      console.log(`\n${result.answer}`);
      console.log(`[Done in ${result.steps} steps]\n`);
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

async function createHarness(project: string, apiKey: string): Promise<Harness> {
  const llmProvider = new OpenAIProvider(apiKey);
  return await buildAgent({
    project,
    llmProvider,
    maxSteps: 50,
    maxDepth: 3,
    tokenLimit: 128000,
    ruleFiles: ['CLAUDE.md', 'AGENTS.md'].filter(f => {
      try { fs.accessSync(f); return true; } catch { return false; }
    }),
    dataDir: './.harness',
  });
}