import fs from 'fs';
import { Harness, HarnessConfig, ToolDefinition } from './types.js';
import { readFileHandler } from '../tools/builtin/read-file.js';
import { writeFileHandler } from '../tools/builtin/write-file.js';
import { bashHandler } from '../tools/builtin/bash.js';
import { Guardrail } from '../governance/guardrail.js';
import { Sandbox } from '../sandbox/sandbox.js';
import { Tracer } from '../observability/tracer.js';
import { initDatabase } from '../memory/database.js';
import type { Database } from '../memory/database.js';
import { SessionManager } from '../memory/session.js';
import { KnowledgeManager } from '../memory/knowledge.js';
import { Retriever } from '../memory/retriever.js';

export async function buildAgent(config: HarnessConfig): Promise<Harness> {
  const systemPrompt = 'You are a coding agent. You have access to tools. Use them to accomplish the user\'s goal.';
  const rules: string[] = [];

  for (const ruleFile of config.ruleFiles) {
    try {
      const content = fs.readFileSync(ruleFile, 'utf-8');
      rules.push(content);
    } catch {
      // file not found, skip
    }
  }

  const tools = new Map<string, ToolDefinition>();
  tools.set('read_file', { name: 'read_file', description: 'Read a file from disk', handler: readFileHandler });
  tools.set('write_file', { name: 'write_file', description: 'Write content to a file', handler: writeFileHandler });
  tools.set('bash', { name: 'bash', description: 'Execute a shell command', handler: bashHandler });

  const guardrail = new Guardrail();
  const sandbox = new Sandbox({ timeout: 30000 });
  const tracer = new Tracer(crypto.randomUUID());
  const db = initDatabase(config.dataDir);
  const sm = new SessionManager(db);
  const km = new KnowledgeManager(db);
  const retriever = new Retriever(km);

  sm.createSession(config.project, 'harness session');

  const memory = {
    read: (goal: string): string => retriever.retrieve(config.project, goal),
    write: (note: string, sessionId: string): void => {
      km.writeNote(config.project, 'decision', note, sessionId);
    },
    consolidate: (context: string[], sessionId: string): void => {
      sm.updateStatus(sessionId, 'consolidated');
    },
  };

  return {
    config,
    systemPrompt,
    rules,
    tools,
    mcpTools: new Map(),
    guardrail: { allow: (a) => guardrail.allow(a), override: () => guardrail.override() },
    hooks: [],
    sandbox,
    tracer: tracer as any,
    memory,
    retriever: { retrieve: (goal: string) => retriever.retrieve(config.project, goal) },
    skills: new Map(),
  };
}