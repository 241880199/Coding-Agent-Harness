import type { DatabaseSync } from 'node:sqlite';

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
  constructor(private db: DatabaseSync) {}

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
    return Number(info.lastInsertRowid);
  }

  getActionLogs(sessionId: string): ActionLog[] {
    return this.db.prepare(
      "SELECT * FROM action_logs WHERE session_id = ? ORDER BY step ASC"
    ).all(sessionId) as ActionLog[];
  }
}