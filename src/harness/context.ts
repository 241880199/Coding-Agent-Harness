import { Message } from './types.js';

export function buildContext(
  goal: string,
  systemPrompt: string,
  rules: string[],
  memoryContext: string,
  retrievedKnowledge: string,
): Message[] {
  const messages: Message[] = [];

  let systemContent = systemPrompt;

  if (rules.length > 0) {
    systemContent += `\n\n## Rules\n${rules.join('\n')}`;
  }

  if (memoryContext) {
    systemContent += `\n\n## Past Knowledge\n${memoryContext}`;
  }

  if (retrievedKnowledge) {
    systemContent += `\n\n## Retrieved Context\n${retrievedKnowledge}`;
  }

  messages.push({ role: 'system', content: systemContent });
  messages.push({ role: 'user', content: goal });

  return messages;
}

function estimateTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
}

export function compact(messages: Message[], tokenLimit: number): Message[] {
  if (estimateTokens(messages) <= tokenLimit) return messages;

  const systemMessages = messages.filter(m => m.role === 'system');
  const rest = messages.filter(m => m.role !== 'system');
  const systemTokens = estimateTokens(systemMessages);
  const availableTokens = Math.max(tokenLimit - systemTokens - 20, 1);

  let kept: Message[] = [];
  let currentTokens = 0;
  for (let i = rest.length - 1; i >= 0; i--) {
    const msgTokens = Math.ceil(rest[i].content.length / 4);
    if (currentTokens + msgTokens > availableTokens && kept.length > 0) break;
    kept.unshift(rest[i]);
    currentTokens += msgTokens;
  }

  return [
    ...systemMessages,
    { role: 'system' as const, content: `[Compressed] ${kept.length} messages retained from ${rest.length}` },
    ...kept,
  ];
}