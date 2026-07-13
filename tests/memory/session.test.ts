import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDatabase } from '../../src/memory/database.js';
import { SessionManager } from '../../src/memory/session.js';

describe('SessionManager', () => {
  let db: ReturnType<typeof createMemoryDatabase>;
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