import type { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { DatabaseSync: DatabaseSyncCtor } = require('node:sqlite') as { DatabaseSync: new (...args: any[]) => DatabaseSync };

export function createMemoryDatabase(): DatabaseSync {
  const db = new DatabaseSyncCtor(':memory:');
  applyMigrations(db);
  return db;
}

export function initDatabase(dataDir: string): DatabaseSync {
  if (dataDir === ':memory:') {
    return createMemoryDatabase();
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'harness.db');
  const db = new DatabaseSyncCtor(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  applyMigrations(db);
  return db;
}

function applyMigrations(db: DatabaseSync): void {
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