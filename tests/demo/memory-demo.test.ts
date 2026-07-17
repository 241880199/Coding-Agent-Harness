import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { KnowledgeManager } from '../../src/memory/knowledge.js';
import { Retriever } from '../../src/memory/retriever.js';

describe('Demo: Memory consolidation and retrieval', () => {
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

  it('should consolidate notes into project knowledge', () => {
    km.writeNote('demo-project', 'decision', 'Use SQLite for storage', null);
    km.writeNote('demo-project', 'architecture', 'Adopt repository pattern', null);
    km.writeNote('demo-project', 'convention', 'Use camelCase for variables', null);

    const notes = km.getNotes('demo-project');
    expect(notes.length).toBe(3);
  });

  it('should retrieve relevant knowledge for a new session', () => {
    km.writeNote('demo-project', 'decision', 'SQLite for persistence', null);
    km.writeNote('demo-project', 'decision', 'Prefer readonly transactions', null);

    const result = retriever.retrieve('demo-project', 'SQLite persistence');
    expect(result).toContain('SQLite');
  });

  it('should deduplicate identical knowledge entries', () => {
    const id1 = km.writeNote('demo-project', 'decision', 'Use SQLite', null);
    const id2 = km.writeNote('demo-project', 'decision', 'Use SQLite', null);
    expect(id2).toBe(id1);
    const notes = km.getNotes('demo-project');
    expect(notes.length).toBe(1);
  });
});