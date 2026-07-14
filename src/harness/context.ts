export function buildContext(
  goal: string,
  systemPrompt: string,
  rules: string[],
  memoryContext: string,
  retrievedKnowledge: string,
): string[] {
  const context: string[] = [];

  context.push(`[System] ${systemPrompt}`);

  if (rules.length > 0) {
    context.push(`[Rules]\n${rules.join('\n')}`);
  }

  if (memoryContext) {
    context.push(`[Past Knowledge]\n${memoryContext}`);
  }

  if (retrievedKnowledge) {
    context.push(`[Retrieved Context]\n${retrievedKnowledge}`);
  }

  context.push(`[Goal] ${goal}`);
  return context;
}

export function compact(context: string[], tokenLimit: number): string[] {
  if (context.length <= tokenLimit) return context;

  const tail = context.slice(-(tokenLimit - 2));
  return [`[Compressed] ${tail.length} messages retained from ${context.length}`, ...tail];
}