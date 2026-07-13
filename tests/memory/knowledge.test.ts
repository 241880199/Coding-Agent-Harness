import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { KnowledgeManager } from '../../src/memory/knowledge.js';

describe('KnowledgeManager', () => {
  let db: ReturnType<typeof createMemoryDatabase>;
  let km: KnowledgeManager;

  beforeEach(() => {
    db = createMemoryDatabase();
    km = new KnowledgeManager(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should write a knowledge entry', () => {
    const id = km.writeNote('my-project', 'decision', 'Use SQLite', null);
    expect(id).toBeGreaterThan(0);
  });

  it('should get notes by project', () => {
    km.writeNote('proj-a', 'decision', 'decision A', null);
    km.writeNote('proj-a', 'convention', 'convention B', null);
    km.writeNote('proj-b', 'decision', 'other decision', null);
    const notes = km.getNotes('proj-a');
    expect(notes.length).toBe(2);
  });

  it('should deduplicate identical content', () => {
    const id1 = km.writeNote('p', 'decision', 'same content', null);
    const id2 = km.writeNote('p', 'decision', 'same content', null);
    expect(id2).toBe(id1);
  });

  it('should filter by category', () => {
    km.writeNote('p', 'decision', 'dec', null);
    km.writeNote('p', 'lesson', 'les', null);
    const decisions = km.getNotes('p', 'decision');
    expect(decisions.length).toBe(1);
    expect(decisions[0].category).toBe('decision');
  });
});