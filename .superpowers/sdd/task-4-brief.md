### Task 4: SQLite 数据库层

**文件：**
- 创建：`src/memory/database.ts`
- 创建：`tests/memory/database.test.ts`

**接口：**
- 消费：无（仅 better-sqlite3 类型）
- 产出：`initDatabase(dataDir: string): Database` — 创建表，返回 db 句柄；`createMemoryDatabase(): Database` — 创建 `:memory:` 数据库供测试用

- [ ] **步骤 1：编写失败测试**

```ts
// tests/memory/database.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMemoryDatabase, initDatabase } from '../../src/memory/database.js';
import Database from 'better-sqlite3';

describe('createMemoryDatabase', () => {
  it('should create an in-memory SQLite database with all tables', () => {
    const db = createMemoryDatabase();
    expect(db).toBeInstanceOf(Database);
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
    expect(db).toBeInstanceOf(Database);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    expect(tables.length).toBeGreaterThanOrEqual(5);
    db.close();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/memory/database.test.ts`
预期：FAIL — 模块未找到

- [ ] **步骤 3：编写最小实现**

```ts
// src/memory/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export function createMemoryDatabase(): Database.Database {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

export function initDatabase(dataDir: string): Database.Database {
  if (dataDir === ':memory:') {
    return createMemoryDatabase();
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'harness.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  applyMigrations(db);
  return db;
}

function applyMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      project     TEXT NOT NULL,
      goal        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','consolidated','archived'))
    );

    CREATE TABLE IF NOT EXISTS action_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT NOT NULL REFERENCES sessions(id),
      step        INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      action_json TEXT NOT NULL,
      result      TEXT,
      feedback    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_action_logs_session ON action_logs(session_id);

    CREATE TABLE IF NOT EXISTS project_knowledge (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      project         TEXT NOT NULL,
      category        TEXT NOT NULL CHECK(category IN ('decision','convention','architecture','lesson')),
      content         TEXT NOT NULL,
      source_session  TEXT REFERENCES sessions(id),
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_project ON project_knowledge(project, category);

    CREATE TABLE IF NOT EXISTS builtin_tools (
      name        TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      handler     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      name        TEXT PRIMARY KEY,
      command     TEXT NOT NULL,
      args        TEXT,
      enabled     INTEGER NOT NULL DEFAULT 1
    );
  `);
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run tests/memory/database.test.ts`
预期：PASS

- [ ] **步骤 5：提交**

```bash
git add src/memory/database.ts tests/memory/database.test.ts
git commit -m "feat: add SQLite database layer with memory migrations"
```

---


