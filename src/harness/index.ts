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
  const systemPrompt = `You are a coding agent with access to tools for reading/writing files and executing shell commands.

## How to work
- Use tools when you need to interact with the filesystem (read files, write files, run commands).
- Answer directly with text when you don't need tools — just write your response without calling any tool.
- Use take_note to record important decisions, conventions, or lessons learned.
- Use spawn_subagent to delegate independent subtasks to a sub-agent.

## Important
- Always provide your final answer as plain text without calling a tool. This signals task completion.
- If a tool fails, analyze the error and try a different approach rather than repeating the same call.`;

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
  tools.set('read_file', {
    name: 'read_file',
    description: 'Read the contents of a file from disk',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative path to the file' },
      },
      required: ['path'],
    },
    handler: readFileHandler,
  });
  tools.set('write_file', {
    name: 'write_file',
    description: 'Write content to a file, creating parent directories if needed',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' },
      },
      required: ['path', 'content'],
    },
    handler: writeFileHandler,
  });
  tools.set('bash', {
    name: 'bash',
    description: 'Execute a shell command and return its output',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
      },
      required: ['command'],
    },
    handler: bashHandler,
  });

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