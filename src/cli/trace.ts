export async function traceCommand(sessionId: string): Promise<void> {
  console.log(`Trace for session: ${sessionId}`);
  console.log('(Trace persistence not yet implemented — will load from SQLite in future)');
}