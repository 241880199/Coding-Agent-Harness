import { buildAgent } from '../harness/index.js';
import { agentLoop } from '../harness/loop.js';
import { CredentialManager } from '../config/credential.js';
import { OpenAIProvider } from '../llm/openai.js';
import fs from 'fs';

export async function startCommand(goal: string, maxSteps?: number): Promise<void> {
  const credMgr = new CredentialManager();
  const apiKey = await credMgr.getKey();

  if (!apiKey) {
    console.error('API Key not configured. Run: harness config set-key');
    process.exit(1);
  }

  console.log(`[Harness] Starting agent for: ${goal}`);
  const baseUrl = await credMgr.getBaseUrl();
  const llmProvider = new OpenAIProvider(apiKey, 'gpt-4o-mini', baseUrl || undefined);
  const harness = await buildAgent({
    project: process.cwd().split(/[/\\]/).pop() || 'default',
    llmProvider,
    maxSteps: maxSteps || 200,
    maxDepth: 3,
    tokenLimit: 128000,
    ruleFiles: ['CLAUDE.md', 'AGENTS.md'].filter(f => {
      try { fs.accessSync(f); return true; } catch { return false; }
    }),
    dataDir: './.harness',
  });

  const result = await agentLoop(goal, harness);
  console.log(`\n[Harness] Completed in ${result.steps} steps`);
  console.log(`[Harness] Answer: ${result.answer}`);
}