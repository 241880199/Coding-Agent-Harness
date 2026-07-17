import fs from 'fs';
import path from 'path';

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
}