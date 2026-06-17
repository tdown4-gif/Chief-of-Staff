import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export type SourceItem = {
  id: number;
  content: string;
  sourceType: string;
  createdAt: string;
};

export type MemoryKind = "person" | "project" | "idea" | "commitment";

export type Memory = {
  id: number;
  sourceItemId: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadataJson: string | null;
  createdAt: string;
};

export type CreateMemoryInput = {
  sourceItemId: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadataJson?: string | null;
};

type SourceItemRow = {
  id: number;
  content: string;
  source_type: string;
  created_at: string;
};

type MemoryRow = {
  id: number;
  source_item_id: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadata_json: string | null;
  created_at: string;
};

const dataDir = path.join(process.cwd(), "data");

let db: Database.Database | undefined;

function getDbPath() {
  return process.env.DATABASE_URL?.replace(/^file:/, "") ?? path.join(dataDir, "chief-of-staff.db");
}

function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'text',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_item_id INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('person', 'project', 'idea', 'commitment')),
        content TEXT NOT NULL,
        confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
        rationale TEXT NOT NULL DEFAULT '',
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memories_source_item_id ON memories(source_item_id);
      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
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

function mapMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    sourceItemId: row.source_item_id,
    kind: row.kind,
    content: row.content,
    confidence: row.confidence,
    rationale: row.rationale,
    metadataJson: row.metadata_json,
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

export function createMemory(input: CreateMemoryInput): Memory {
  if (!Number.isInteger(input.sourceItemId) || input.sourceItemId < 1) {
    throw new Error("Memory requires a valid source item.");
  }

  if (!input.content.trim()) {
    throw new Error("Memory content cannot be empty.");
  }

  if (!Number.isInteger(input.confidence) || input.confidence < 0 || input.confidence > 100) {
    throw new Error("Memory confidence must be an integer from 0 to 100.");
  }

  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare(`
      INSERT INTO memories (source_item_id, kind, content, confidence, rationale, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.sourceItemId,
      input.kind,
      input.content,
      input.confidence,
      input.rationale,
      input.metadataJson ?? null,
      createdAt
    );

  return {
    id: Number(result.lastInsertRowid),
    sourceItemId: input.sourceItemId,
    kind: input.kind,
    content: input.content,
    confidence: input.confidence,
    rationale: input.rationale,
    metadataJson: input.metadataJson ?? null,
    createdAt
  };
}

export function listMemoriesForSource(sourceItemId: number): Memory[] {
  const rows = getDb()
    .prepare(`
      SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, created_at
      FROM memories
      WHERE source_item_id = ?
      ORDER BY id DESC
    `)
    .all(sourceItemId) as MemoryRow[];

  return rows.map(mapMemory);
}
