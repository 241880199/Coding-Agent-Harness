import { describe, it, expect } from 'vitest';
import { createMemoryDatabase, initDatabase } from '../../src/memory/database.js';

describe('createMemoryDatabase', () => {
  it('should create an in-memory SQLite database with all tables', () => {
    const db = createMemoryDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('action_logs');
    expect(tableNames).toContain('project_knowledge');
    expect(tableNames).toContain('builtin_tools');
    expect(tableNames).toContain('mcp_servers');
    db.close();
  });

  it('should create tables with correct schema', () => {
    const db = createMemoryDatabase();
    const cols = db.prepare("PRAGMA table_info('sessions')").all() as { name: string; type: string; notnull: number }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('project');
    expect(colNames).toContain('goal');
    expect(colNames).toContain('status');
    db.close();
  });

  it('should support inserting and querying sessions', () => {
    const db = createMemoryDatabase();
    db.prepare("INSERT INTO sessions (id, project, goal, status) VALUES (?, ?, ?, ?)").run('s1', 'test-proj', 'fix bug', 'active');
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get('s1') as { project: string; goal: string };
    expect(row.project).toBe('test-proj');
    expect(row.goal).toBe('fix bug');
    db.close();
  });
});

describe('initDatabase', () => {
  it('should create database file and tables', () => {
    const db = initDatabase(':memory:');
    expect(db).toBeDefined();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    expect(tables.length).toBeGreaterThanOrEqual(5);
    db.close();
  });
});