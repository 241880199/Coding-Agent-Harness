import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { KnowledgeManager } from '../../src/memory/knowledge.js';
import { Retriever } from '../../src/memory/retriever.js';

describe('Retriever', () => {
  let db: ReturnType<typeof createMemoryDatabase>;
  let km: KnowledgeManager;
  let retriever: Retriever;

  beforeEach(() => {
    db = createMemoryDatabase();
    km = new KnowledgeManager(db);
    retriever = new Retriever(km);
  });

  afterEach(() => {
    db.close();
  });

  it('should retrieve relevant knowledge for a goal', () => {
    km.writeNote('my-project', 'architecture', 'Uses SQLite for persistence', null);
    km.writeNote('my-project', 'decision', 'Prefer readonly transactions', null);
    const result = retriever.retrieve('my-project', 'using SQLite and readonly transactions');
    expect(result).toContain('SQLite');
    expect(result).toContain('readonly');
  });

  it('should return empty string when no matches', () => {
    const result = retriever.retrieve('empty-project', 'anything');
    expect(result).toBe('');
  });

  it('should limit to max 5 entries', () => {
    for (let i = 0; i < 10; i++) {
      km.writeNote('p', 'decision', `entry ${i}`, null);
    }
    const result = retriever.retrieve('p', 'entry');
    const lines = result.split('\n').filter(l => l.trim());
    expect(lines.length).toBeLessThanOrEqual(5);
  });
});