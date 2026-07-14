import * as readline from 'readline';

export class HITL {
  constructor(private promptUser: (question: string) => Promise<string> = defaultPrompt) {}

  async confirm(action: string): Promise<boolean> {
    const answer = await this.promptUser(
      `[!] Dangerous operation detected: ${action}\n    Enter 'y' to confirm, 'n' to reject: `
    );
    return answer.trim().toLowerCase() === 'y';
  }
}

async function defaultPrompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}