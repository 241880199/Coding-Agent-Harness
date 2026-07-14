import { Harness, Action, ActionResult } from './types.js';
import { buildContext, compact } from './context.js';

export interface LoopResult {
  answer: string;
  steps: number;
  trace: Array<{ step: number; action: Action; result: ActionResult }>;
}

export async function agentLoop(goal: string, harness: Harness, depth: number = 0): Promise<LoopResult> {
  const memoryCtx = harness.memory.read(goal);
  const retrievedCtx = harness.retriever.retrieve(goal);
  let context = buildContext(goal, harness.systemPrompt, harness.rules, memoryCtx, retrievedCtx);

  let done = false;
  let answer = '';
  let steps = 0;
  const trace: Array<{ step: number; action: Action; result: ActionResult }> = [];

  while (!done && steps < harness.config.maxSteps) {
    steps++;

    if (context.length > harness.config.tokenLimit) {
      context = compact(context, harness.config.tokenLimit);
    }

    let response;
    try {
      response = await harness.config.llmProvider.call(context);
    } catch (e) {
      context.push(`[Error] LLM call failed: ${(e as Error).message}`);
      (harness.tracer as any).record(
        { type: 'unknown' },
        { success: false, error: (e as Error).message },
      );
      continue;
    }

    const { text, action } = response;
    (harness.tracer as any).record(action, { success: true, data: text });

    if (action.type === 'done') {
      done = true;
      answer = text;
      trace.push({ step: steps, action, result: { success: true, data: text } });
      continue;
    }

    if (action.type === 'take_note') {
      const note = (action as any).note as string;
      harness.memory.write(note, (harness.tracer as any).sessionId);
      context.push(`[Note] ${note}`);
      trace.push({ step: steps, action, result: { success: true, data: `Note recorded: ${note}` } });
      continue;
    }

    const guardResult = harness.guardrail.allow(action);
    if (!guardResult.allow) {
      context.push(`[Guardrail] Action blocked: ${guardResult.reason}`);
      trace.push({ step: steps, action, result: { success: false, error: guardResult.reason } });
      continue;
    }

    let hookDenied = false;
    for (const hook of harness.hooks) {
      const result = await hook('PreToolUse', { action });
      if (result === 'deny') {
        context.push(`[Hook] Action denied by PreToolUse hook`);
        hookDenied = true;
        break;
      }
    }
    if (hookDenied) continue;

    if (action.type === 'call_tool') {
      const { tool, args } = action;
      let result: ActionResult;

      if (harness.tools.get(tool)) {
        const toolDef = harness.tools.get(tool)!;
        result = await harness.sandbox.run(toolDef, args);
      } else if (harness.mcpTools.get(tool)) {
        const toolDef = harness.mcpTools.get(tool)!;
        result = await harness.sandbox.run(toolDef, args);
      } else {
        result = { success: false, error: `Tool '${tool}' not found` };
      }

      context.push(`[Tool Result] ${result.success ? result.data : result.error}`);
      trace.push({ step: steps, action, result });

      for (const hook of harness.hooks) {
        await hook('PostToolUse', { action, result });
      }

      if (action.changed_code) {
        (harness.tracer as any).record(action, result, 'running sensors');
      }
    } else if (action.type === 'use_skill') {
      const skillName = (action as any).name as string;
      const skill = harness.skills.get(skillName);
      if (skill) {
        const instructions = skill.load();
        context.push(`[Skill] ${skillName}\n${instructions}`);
      } else {
        context.push(`[Skill] Unknown skill: ${skillName}`);
      }
      trace.push({ step: steps, action, result: { success: true, data: `Loaded skill: ${skillName}` } });
    } else if (action.type === 'spawn_subagent') {
      if (depth >= harness.config.maxDepth) {
        context.push(`[Subagent] Max depth reached, cannot spawn subagent`);
        trace.push({ step: steps, action, result: { success: false, error: 'Max depth reached' } });
        continue;
      }
      const subtask = (action as any).subtask as string;
      const subResult = await agentLoop(subtask, harness, depth + 1);
      context.push(`[Subagent] ${subResult.answer}`);
      trace.push({ step: steps, action, result: { success: true, data: subResult.answer } });
    } else {
      context.push(`[Unknown] Unknown action type: ${(action as any).type}`);
      trace.push({ step: steps, action, result: { success: false, error: 'Unknown action type' } });
    }
  }

  if (!done) {
    answer = `Reached max steps (${harness.config.maxSteps}) without completion`;
  }

  for (const hook of harness.hooks) {
    await hook('SessionEnd', {});
  }

  harness.memory.consolidate(context, (harness.tracer as any).sessionId);

  return { answer, steps, trace };
}