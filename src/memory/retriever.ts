import type { KnowledgeManager } from './knowledge.js';

export class Retriever {
  constructor(private km: KnowledgeManager) {}

  retrieve(project: string, goal: string): string {
    const keywords = goal.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const seen = new Set<number>();
    const results: string[] = [];

    for (const keyword of keywords) {
      const matches = this.km.search(project, keyword);
      for (const match of matches) {
        if (!seen.has(match.id) && results.length < 5) {
          seen.add(match.id);
          results.push(`[${match.category}] ${match.content}`);
        }
      }
      if (results.length >= 5) break;
    }

    if (results.length === 0) {
      const recent = this.km.getNotes(project);
      for (const note of recent) {
        if (results.length < 5) {
          results.push(`[${note.category}] ${note.content}`);
        }
      }
    }

    return results.join('\n');
  }
}