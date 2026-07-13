export type ActionType = 'call_tool' | 'use_skill' | 'spawn_subagent' | 'take_note' | 'done' | 'unknown';

export interface CallToolAction {
  type: 'call_tool';
  tool: string;
  args: Record<string, unknown>;
  changed_code?: boolean;
}

export interface UseSkillAction {
  type: 'use_skill';
  name: string;
}

export interface SpawnSubagentAction {
  type: 'spawn_subagent';
  subtask: string;
  scope?: string[];
}

export interface TakeNoteAction {
  type: 'take_note';
  note: string;
}

export interface DoneAction {
  type: 'done';
}

export type Action = CallToolAction | UseSkillAction | SpawnSubagentAction | TakeNoteAction | DoneAction | { type: 'unknown' };

export interface ActionResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface LLMResponse {
  text: string;
  action: Action;
}

export interface LLMProvider {
  call(context: string[]): Promise<LLMResponse>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  handler: (args: Record<string, unknown>) => Promise<ActionResult>;
}

export interface GuardrailResult {
  allow: boolean;
  reason?: string;
}

export interface SensorDetail {
  test: string;
  status: 'pass' | 'fail';
  message: string;
}

export interface SensorReport {
  pass: boolean;
  details: SensorDetail[];
}

export type MemoryCategory = 'decision' | 'convention' | 'architecture' | 'lesson';

export interface MemoryEntry {
  project: string;
  category: MemoryCategory;
  content: string;
  source_session?: string;
}

export interface TraceEntry {
  step: number;
  action: Action;
  result: ActionResult;
  feedback?: string;
}

export type HookEventType = 'PreToolUse' | 'PostToolUse' | 'SessionEnd';

export interface HookContext {
  action?: Action;
  result?: ActionResult;
}

export type HookHandler = (event: HookEventType, context: HookContext) => Promise<'deny' | 'allow' | void>;

export interface HarnessConfig {
  project: string;
  llmProvider: LLMProvider;
  maxSteps: number;
  maxDepth: number;
  tokenLimit: number;
  ruleFiles: string[];
  dataDir: string;
}

export interface Harness {
  config: HarnessConfig;
  systemPrompt: string;
  rules: string[];
  tools: Map<string, ToolDefinition>;
  mcpTools: Map<string, ToolDefinition>;
  guardrail: { allow(action: Action): GuardrailResult; override(): void };
  hooks: HookHandler[];
  sandbox: { run(tool: ToolDefinition, args: Record<string, unknown>): Promise<ActionResult> };
  tracer: TraceEntry[];
  memory: { read(goal: string): string; write(note: string, sessionId: string): void; consolidate(context: string[], sessionId: string): void };
  retriever: { retrieve(goal: string): string };
  skills: Map<string, { description: string; load(): string }>;
}