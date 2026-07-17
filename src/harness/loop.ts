import { Harness, Action, ActionResult, Message, ToolDefinition } from './types.js';
import { buildContext, compact, estimateTokens } from './context.js';

export interface LoopResult {
  answer: string;
  steps: number;
  trace: Array<{ step: number; action: Action; result: ActionResult }>;
}

export async function agentLoop(goal: string, harness: Harness, depth: number = 0): Promise<LoopResult> {
  const memoryCtx = harness.memory.read(goal);
  const retrievedCtx = harness.retriever.retrieve(goal);
  let messages: Message[] = buildContext(goal, harness.systemPrompt, harness.rules, memoryCtx, retrievedCtx);

  let done = false;
  let answer = '';
  let steps = 0;
  const recentToolCalls: string[] = [];
  const trace: Array<{ step: number; action: Action; result: ActionResult }> = [];

  while (!done && steps < harness.config.maxSteps) {
    steps++;

    if (estimateTokens(messages) > harness.config.tokenLimit) {
      messages = compact(messages, harness.config.tokenLimit);
    }

    const allTools: ToolDefinition[] = [
      ...harness.tools.values(),
      ...harness.mcpTools.values(),
    ];

    let response;
    try {
      response = await harness.config.llmProvider.call(messages, allTools);
    } catch (e) {
      messages.push({ role: 'user', content: `[Error] LLM call failed: ${(e as Error).message}` });
      (harness.tracer as any).record(
        { type: 'unknown' },
        { success: false, error: (e as Error).message },
      );
      continue;
    }

    const { text, action } = response;
    (harness.tracer as any).record(action, { success: true, data: text });

    messages.push({ role: 'assistant', content: text });

    if (action.type === 'done') {
      done = true;
      answer = text;
      trace.push({ step: steps, action, result: { success: true, data: text } });
      continue;
    }

    if (action.type === 'take_note') {
      const note = (action as any).note as string;
      harness.memory.write(note, (harness.tracer as any).sessionId);
      messages.push({ role: 'user', content: `[Note recorded] ${note}` });
      trace.push({ step: steps, action, result: { success: true, data: `Note recorded: ${note}` } });
      continue;
    }

    const guardResult = harness.guardrail.allow(action);
    if (!guardResult.allow) {
      messages.push({ role: 'user', content: `[Guardrail] Action blocked: ${guardResult.reason}` });
      trace.push({ step: steps, action, result: { success: false, error: guardResult.reason } });
      continue;
    }

    let hookDenied = false;
    for (const hook of harness.hooks) {
      const result = await hook('PreToolUse', { action });
      if (result === 'deny') {
        messages.push({ role: 'user', content: `[Hook] Action denied by PreToolUse hook` });
        hookDenied = true;
        break;
      }
    }
    if (hookDenied) continue;

    if (action.type === 'call_tool') {
      const { tool, args } = action;
      const callSig = `${tool}:${JSON.stringify(args)}`;

      recentToolCalls.push(callSig);
      if (recentToolCalls.length > 3) recentToolCalls.shift();

      if (
        recentToolCalls.length === 3 &&
        recentToolCalls[0] === callSig &&
        recentToolCalls[1] === callSig
      ) {
        messages.push({
          role: 'user',
          content: `[Loop detected] You have called '${tool}' with the same arguments 3 times in a row. This indicates a loop. Stop and provide your best answer based on what you know so far, or try a fundamentally different approach.`,
        });
        recentToolCalls.length = 0;
        trace.push({ step: steps, action, result: { success: false, error: 'Loop detected' } });
        continue;
      }

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

      messages.push({ role: 'tool', content: result.success ? (result.data || '') : (result.error || '') });
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
        messages.push({ role: 'user', content: `[Skill] ${skillName}\n${instructions}` });
      } else {
        messages.push({ role: 'user', content: `[Skill] Unknown skill: ${skillName}` });
      }
      trace.push({ step: steps, action, result: { success: true, data: `Loaded skill: ${skillName}` } });
    } else if (action.type === 'spawn_subagent') {
      if (depth >= harness.config.maxDepth) {
        messages.push({ role: 'user', content: `[Subagent] Max depth reached, cannot spawn subagent` });
        trace.push({ step: steps, action, result: { success: false, error: 'Max depth reached' } });
        continue;
      }
      const subtask = (action as any).subtask as string;
      const subResult = await agentLoop(subtask, harness, depth + 1);
      messages.push({ role: 'user', content: `[Subagent] ${subResult.answer}` });
      trace.push({ step: steps, action, result: { success: true, data: subResult.answer } });
    } else {
      messages.push({ role: 'user', content: `[Unknown] Unknown action type: ${(action as any).type}` });
      trace.push({ step: steps, action, result: { success: false, error: 'Unknown action type' } });
    }
  }

  if (!done) {
    answer = `Reached max steps (${harness.config.maxSteps}) without completion`;
  }

  for (const hook of harness.hooks) {
    await hook('SessionEnd', {});
  }

  harness.memory.consolidate(messages.map(m => m.content), (harness.tracer as any).sessionId);

  return { answer, steps, trace };
}