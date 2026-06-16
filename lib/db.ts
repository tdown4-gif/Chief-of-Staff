import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export type SourceItem = {
  id: number;
  content: string;
  sourceType: string;
  createdAt: string;
};

type SourceItemRow = {
  id: number;
  content: string;
  source_type: string;
  created_at: string;
};

const dataDir = path.join(process.cwd(), "data");
const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") ?? path.join(dataDir, "chief-of-staff.db");

let db: Database.Database | undefined;

function getDb() {
  if (!db) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'text',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  return db;
}

function mapSourceItem(row: SourceItemRow): SourceItem {
  return {
    id: row.id,
    content: row.content,
    sourceType: row.source_type,
    createdAt: row.created_at
  };
}

export function createSourceItem(content: string, sourceType = "text"): SourceItem {
  // Reject empty/whitespace-only input, but preserve the raw source verbatim.
  // Source-backed recall depends on byte-exact source, so we do not trim what we store.
  if (!content.trim()) {
    throw new Error("Capture cannot be empty.");
  }

  const database = getDb();
  const createdAt = new Date().toISOString();
  const result = database
    .prepare("INSERT INTO source_items (content, source_type, created_at) VALUES (?, ?, ?)")
    .run(content, sourceType, createdAt);

  return {
    id: Number(result.lastInsertRowid),
    content,
    sourceType,
    createdAt
  };
}

export function listRecentSourceItems(limit = 20): SourceItem[] {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = getDb()
    .prepare("SELECT id, content, source_type, created_at FROM source_items ORDER BY datetime(created_at) DESC, id DESC LIMIT ?")
    .all(safeLimit) as SourceItemRow[];

  return rows.map(mapSourceItem);
}

export function countSourceItems(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM source_items").get() as { count: number };
  return row.count;
}
