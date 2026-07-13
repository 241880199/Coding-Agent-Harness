### Task 5: 记忆模块 — 会话与知识 CRUD

**文件：**
- 创建：`src/memory/session.ts`
- 创建：`src/memory/knowledge.ts`
- 创建：`src/memory/retriever.ts`
- 创建：`tests/memory/session.test.ts`
- 创建：`tests/memory/knowledge.test.ts`
- 创建：`tests/memory/retriever.test.ts`

**接口：**
- 消费：来自 `better-sqlite3` 的 `Database`，来自 `database.ts` 的 `createMemoryDatabase`
- 产出：`SessionManager`（创建会话、记录动作、获取会话）、`KnowledgeManager`（写入笔记、获取笔记、去重）、`Retriever`（按项目+关键词检索）

- [ ] **步骤 1：为 session.ts 编写失败测试**

```ts
// tests/memory/session.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { SessionManager } from '../../src/memory/session.js';
import Database from 'better-sqlite3';

describe('SessionManager', () => {
  let db: Database.Database;
  let sm: SessionManager;

  beforeEach(() => {
    db = createMemoryDatabase();
    sm = new SessionManager(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should create a new session', () => {
    const session = sm.createSession('my-project', 'fix type errors');
    expect(session.id).toBeTruthy();
    expect(session.project).toBe('my-project');
    expect(session.goal).toBe('fix type errors');
    expect(session.status).toBe('active');
  });

  it('should log an action', () => {
    const session = sm.createSession('p', 'g');
    const log = sm.logAction(session.id, 1, 'call_tool', JSON.stringify({ tool: 'read_file' }), null, null);
    expect(log).toBeGreaterThan(0);
  });

  it('should get session by id', () => {
    const created = sm.createSession('p', 'g');
    const fetched = sm.getSession(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
  });

  it('should return null for non-existent session', () => {
    const fetched = sm.getSession('non-existent');
    expect(fetched).toBeNull();
  });

  it('should update session status', () => {
    const session = sm.createSession('p', 'g');
    sm.updateStatus(session.id, 'consolidated');
    const fetched = sm.getSession(session.id);
    expect(fetched!.status).toBe('consolidated');
  });

  it('should get action logs for a session', () => {
    const session = sm.createSession('p', 'g');
    sm.logAction(session.id, 1, 'read_file', '{}', 'ok', null);
    sm.logAction(session.id, 2, 'write_file', '{}', 'done', 'pass');
    const logs = sm.getActionLogs(session.id);
    expect(logs.length).toBe(2);
    expect(logs[0].step).toBe(1);
    expect(logs[1].step).toBe(2);
  });
});
```

- [ ] **步骤 2：为 knowledge.ts 编写失败测试**

```ts
// tests/memory/knowledge.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { KnowledgeManager } from '../../src/memory/knowledge.js';
import Database from 'better-sqlite3';

describe('KnowledgeManager', () => {
  let db: Database.Database;
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
```

- [ ] **步骤 3：为 retriever.ts 编写失败测试**

```ts
// tests/memory/retriever.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { KnowledgeManager } from '../../src/memory/knowledge.js';
import { Retriever } from '../../src/memory/retriever.js';
import Database from 'better-sqlite3';

describe('Retriever', () => {
  let db: Database.Database;
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
    const result = retriever.retrieve('my-project', 'how to store data');
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
```

- [ ] **步骤 4：运行测试验证失败**

运行：`npx vitest run tests/memory/session.test.ts tests/memory/knowledge.test.ts tests/memory/retriever.test.ts`
预期：FAIL — 模块未找到

- [ ] **步骤 5：编写最小实现**

```ts
// src/memory/session.ts
import Database from 'better-sqlite3';

export interface Session {
  id: string;
  project: string;
  goal: string;
  created_at: string;
  status: string;
}

export interface ActionLog {
  id: number;
  session_id: string;
  step: number;
  action_type: string;
  action_json: string;
  result: string | null;
  feedback: string | null;
}

export class SessionManager {
  constructor(private db: Database.Database) {}

  createSession(project: string, goal: string): Session {
    const id = crypto.randomUUID();
    this.db.prepare(
      "INSERT INTO sessions (id, project, goal) VALUES (?, ?, ?)"
    ).run(id, project, goal);
    return this.getSession(id)!;
  }

  getSession(id: string): Session | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Session | undefined;
    return row || null;
  }

  updateStatus(id: string, status: string): void {
    this.db.prepare("UPDATE sessions SET status = ? WHERE id = ?").run(status, id);
  }

  logAction(sessionId: string, step: number, actionType: string, actionJson: string, result: string | null, feedback: string | null): number {
    const info = this.db.prepare(
      "INSERT INTO action_logs (session_id, step, action_type, action_json, result, feedback) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(sessionId, step, actionType, actionJson, result, feedback);
    return info.lastInsertRowid as number;
  }

  getActionLogs(sessionId: string): ActionLog[] {
    return this.db.prepare(
      "SELECT * FROM action_logs WHERE session_id = ? ORDER BY step ASC"
    ).all(sessionId) as ActionLog[];
  }
}
```

```ts
// src/memory/knowledge.ts
import Database from 'better-sqlite3';
import { MemoryCategory, MemoryEntry } from '../harness/types.js';

export interface KnowledgeRow {
  id: number;
  project: string;
  category: string;
  content: string;
  source_session: string | null;
  created_at: string;
  updated_at: string;
}

export class KnowledgeManager {
  constructor(private db: Database.Database) {}

  writeNote(project: string, category: MemoryCategory, content: string, sourceSession: string | null): number {
    const existing = this.db.prepare(
      "SELECT id FROM project_knowledge WHERE project = ? AND content = ?"
    ).get(project, content) as { id: number } | undefined;
    if (existing) return existing.id;
    this.db.prepare(
      "INSERT INTO project_knowledge (project, category, content, source_session) VALUES (?, ?, ?, ?)"
    ).run(project, category, content, sourceSession);
    return (this.db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getNotes(project: string, category?: MemoryCategory): KnowledgeRow[] {
    if (category) {
      return this.db.prepare(
        "SELECT * FROM project_knowledge WHERE project = ? AND category = ? ORDER BY created_at DESC"
      ).all(project, category) as KnowledgeRow[];
    }
    return this.db.prepare(
      "SELECT * FROM project_knowledge WHERE project = ? ORDER BY created_at DESC"
    ).all(project) as KnowledgeRow[];
  }

  search(project: string, keyword: string): KnowledgeRow[] {
    return this.db.prepare(
      "SELECT * FROM project_knowledge WHERE project = ? AND content LIKE ? ORDER BY created_at DESC LIMIT 5"
    ).all(project, `%${keyword}%`) as KnowledgeRow[];
  }
}
```

```ts
// src/memory/retriever.ts
import { KnowledgeManager } from './knowledge.js';

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

    return results.join('\n');
  }
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/memory/session.test.ts tests/memory/knowledge.test.ts tests/memory/retriever.test.ts`
预期：PASS

- [ ] **步骤 7：提交**

```bash
git add src/memory/session.ts src/memory/knowledge.ts src/memory/retriever.ts tests/memory/session.test.ts tests/memory/knowledge.test.ts tests/memory/retriever.test.ts
git commit -m "feat: add memory module with session, knowledge, and retriever"
```

---


