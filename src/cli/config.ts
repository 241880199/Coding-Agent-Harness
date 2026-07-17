import { CredentialManager } from '../config/credential.js';
import * as readline from 'readline';

function question(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

export async function configCommand(subcommand: string): Promise<void> {
  const credMgr = new CredentialManager();

  switch (subcommand) {
    case 'set-key': {
      const key = await question('Enter your API Key (input hidden): ');
      await credMgr.setKey(key.trim());
      console.log('API Key saved.');
      break;
    }
    case 'view-key': {
      const status = await credMgr.viewStatus();
      console.log(status);
      break;
    }
    case 'clear-key': {
      await credMgr.clearKey();
      console.log('API Key cleared.');
      break;
    }
    default:
      console.log('Usage: harness config set-key|view-key|clear-key');
  }
}