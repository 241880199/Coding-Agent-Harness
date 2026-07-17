import fs from 'fs';
import path from 'path';
import { CredentialManager } from '../config/credential.js';

export async function initCommand(projectName: string): Promise<void> {
  const dir = path.resolve(projectName);
  if (fs.existsSync(dir)) {
    console.error(`Directory '${projectName}' already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, '.harness'), { recursive: true });

  const rulesContent = `# Project Rules for ${projectName}
- All code must pass TypeScript strict mode
- Use TDD for all changes
- API Keys must never be hardcoded
`;

  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), rulesContent);
  fs.writeFileSync(path.join(dir, '.gitignore'), `node_modules/\n.harness/\n.env\n`);

  console.log(`Initialized project '${projectName}' with CLAUDE.md and .harness/`);
  console.log(`  cd ${projectName}`);

  const credMgr = new CredentialManager();
  const apiKey = await credMgr.getKey();

  if (!apiKey) {
    console.log('\n========================================');
    console.log('  API Key not configured!');
    console.log('========================================');
    console.log('\n  To use the coding agent, you need to set your API key:');
    console.log('\n    harness config set-key');
    console.log('\n  Or set environment variable:');
    console.log('    set HARNESS_API_KEY=sk-your-key-here');
    console.log('\n  After configuring, start the agent with:');
    console.log('    harness');
    console.log('========================================\n');
  } else {
    console.log('\n  API Key is configured. Start the agent with:');
    console.log('    harness');
    console.log('');
  }
}