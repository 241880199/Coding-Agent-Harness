import type { Database } from './database.js';
import type { MemoryCategory } from '../harness/types.js';

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
  constructor(private db: Database) {}

  writeNote(project: string, category: MemoryCategory, content: string, sourceSession: string | null): number {
    const existing = this.db.prepare(
      "SELECT id FROM project_knowledge WHERE project = ? AND content = ?"
    ).get(project, content) as { id: number } | undefined;
    if (existing) return existing.id;
    this.db.prepare(
      "INSERT INTO project_knowledge (project, category, content, source_session) VALUES (?, ?, ?, ?)"
    ).run(project, category, content, sourceSession);
    return Number((this.db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id);
  }

  getNotes(project: string, category?: MemoryCategory): KnowledgeRow[] {
    if (category) {
      return this.db.prepare(
        "SELECT * FROM project_knowledge WHERE project = ? AND category = ? ORDER BY created_at DESC"
      ).all(project, category) as unknown as KnowledgeRow[];
    }
    return this.db.prepare(
      "SELECT * FROM project_knowledge WHERE project = ? ORDER BY created_at DESC"
    ).all(project) as unknown as KnowledgeRow[];
  }

  search(project: string, keyword: string): KnowledgeRow[] {
    return this.db.prepare(
      "SELECT * FROM project_knowledge WHERE project = ? AND content LIKE ? ORDER BY created_at DESC LIMIT 5"
    ).all(project, `%${keyword}%`) as unknown as KnowledgeRow[];
  }
}