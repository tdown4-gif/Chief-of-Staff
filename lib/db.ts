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
export type MemoryStatus = "active" | "done" | "dismissed";

export type Memory = {
  id: number;
  sourceItemId: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadataJson: string | null;
  status: MemoryStatus;
  createdAt: string;
};

export type CreateMemoryInput = {
  sourceItemId: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadataJson?: string | null;
  status?: MemoryStatus;
};

export type MemoriesBySourceId = Record<number, Memory[]>;
export type MemoryWithSource = {
  memory: Memory;
  source: SourceItem;
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
  status: MemoryStatus;
  created_at: string;
};

type MemoryWithSourceRow = {
  memory_id: number;
  source_item_id: number;
  kind: MemoryKind;
  memory_content: string;
  confidence: number;
  rationale: string;
  metadata_json: string | null;
  status: MemoryStatus;
  memory_created_at: string;
  source_id: number;
  source_content: string;
  source_type: string;
  source_created_at: string;
};

const dataDir = path.join(process.cwd(), "data");
const memoryStatuses = new Set<MemoryStatus>(["active", "done", "dismissed"]);

let db: Database.Database | undefined;
let currentDbPath: string | undefined;

function getDbPath() {
  return process.env.DATABASE_URL?.replace(/^file:/, "") ?? path.join(dataDir, "chief-of-staff.db");
}

function getDb() {
  const dbPath = getDbPath();

  if (db && currentDbPath !== dbPath) {
    db.close();
    db = undefined;
    currentDbPath = undefined;
  }

  if (!db) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    currentDbPath = dbPath;
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
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'dismissed')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memories_source_item_id ON memories(source_item_id);
      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
    `);

    const memoryColumns = db.prepare("PRAGMA table_info(memories)").all() as Array<{ name: string }>;
    if (!memoryColumns.some((column) => column.name === "status")) {
      db.exec(`
        ALTER TABLE memories
        ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'dismissed'))
      `);
    }
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
    status: row.status,
    createdAt: row.created_at
  };
}

function mapMemoryWithSource(row: MemoryWithSourceRow): MemoryWithSource {
  return {
    memory: mapMemory({
      id: row.memory_id,
      source_item_id: row.source_item_id,
      kind: row.kind,
      content: row.memory_content,
      confidence: row.confidence,
      rationale: row.rationale,
      metadata_json: row.metadata_json,
      status: row.status,
      created_at: row.memory_created_at
    }),
    source: mapSourceItem({
      id: row.source_id,
      content: row.source_content,
      source_type: row.source_type,
      created_at: row.source_created_at
    })
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
  const safeLimit = Math.min(Math.max(limit, 1), 1000);
  const rows = getDb()
    .prepare("SELECT id, content, source_type, created_at FROM source_items ORDER BY datetime(created_at) DESC, id DESC LIMIT ?")
    .all(safeLimit) as SourceItemRow[];

  return rows.map(mapSourceItem);
}

export function countSourceItems(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM source_items").get() as { count: number };
  return row.count;
}

function validateMemoryInput(input: CreateMemoryInput) {
  if (!Number.isInteger(input.sourceItemId) || input.sourceItemId < 1) {
    throw new Error("Memory requires a valid source item.");
  }

  if (!input.content.trim()) {
    throw new Error("Memory content cannot be empty.");
  }

  if (!input.rationale.trim()) {
    throw new Error("Memory rationale cannot be empty.");
  }

  if (!Number.isInteger(input.confidence) || input.confidence < 0 || input.confidence > 100) {
    throw new Error("Memory confidence must be an integer from 0 to 100.");
  }

  if (input.status && !memoryStatuses.has(input.status)) {
    throw new Error("Memory status must be active, done, or dismissed.");
  }
}

function validateMemoryStatus(status: MemoryStatus) {
  if (!memoryStatuses.has(status)) {
    throw new Error("Memory status must be active, done, or dismissed.");
  }
}

function insertMemory(database: Database.Database, input: CreateMemoryInput): Memory {
  validateMemoryInput(input);

  const createdAt = new Date().toISOString();
  const result = database
    .prepare(`
      INSERT INTO memories (source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.sourceItemId,
      input.kind,
      input.content,
      input.confidence,
      input.rationale,
      input.metadataJson ?? null,
      input.status ?? "active",
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
    status: input.status ?? "active",
    createdAt
  };
}

export function createMemory(input: CreateMemoryInput): Memory {
  return insertMemory(getDb(), input);
}

export function createMemories(inputs: CreateMemoryInput[]): Memory[] {
  const database = getDb();
  const insertAll = database.transaction((memoryInputs: CreateMemoryInput[]) =>
    memoryInputs.map((input) => insertMemory(database, input))
  );

  return insertAll(inputs);
}

export function listMemoriesForSource(sourceItemId: number): Memory[] {
  const rows = getDb()
    .prepare(`
      SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
      FROM memories
      WHERE source_item_id = ?
      ORDER BY id DESC
    `)
    .all(sourceItemId) as MemoryRow[];

  return rows.map(mapMemory);
}

export function listMemoriesForSources(sourceItemIds: number[]): MemoriesBySourceId {
  const safeIds = [...new Set(sourceItemIds.filter((id) => Number.isInteger(id) && id > 0))];
  const memoriesBySource: MemoriesBySourceId = Object.fromEntries(safeIds.map((id) => [id, []]));

  if (safeIds.length === 0) {
    return memoriesBySource;
  }

  const placeholders = safeIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`
      SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
      FROM memories
      WHERE source_item_id IN (${placeholders})
      ORDER BY source_item_id ASC, id DESC
    `)
    .all(...safeIds) as MemoryRow[];

  for (const memory of rows.map(mapMemory)) {
    memoriesBySource[memory.sourceItemId] ??= [];
    memoriesBySource[memory.sourceItemId].push(memory);
  }

  return memoriesBySource;
}

export function updateMemoryStatus(memoryId: number, status: MemoryStatus): Memory {
  if (!Number.isInteger(memoryId) || memoryId < 1) {
    throw new Error("Memory requires a valid id.");
  }

  validateMemoryStatus(status);
  const database = getDb();
  database.prepare("UPDATE memories SET status = ? WHERE id = ?").run(status, memoryId);
  const row = database
    .prepare(`
      SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
      FROM memories
      WHERE id = ?
    `)
    .get(memoryId) as MemoryRow | undefined;

  if (!row) {
    throw new Error("Memory not found.");
  }

  return mapMemory(row);
}

export function updateMemoryContent(memoryId: number, content: string): Memory {
  if (!Number.isInteger(memoryId) || memoryId < 1) {
    throw new Error("Memory requires a valid id.");
  }

  const normalizedContent = content.trim().replace(/\s+/g, " ");
  if (!normalizedContent) {
    throw new Error("Memory content cannot be empty.");
  }

  const database = getDb();
  database.prepare("UPDATE memories SET content = ? WHERE id = ?").run(normalizedContent, memoryId);
  const row = database
    .prepare(`
      SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
      FROM memories
      WHERE id = ?
    `)
    .get(memoryId) as MemoryRow | undefined;

  if (!row) {
    throw new Error("Memory not found.");
  }

  return mapMemory(row);
}

export function deleteMemory(memoryId: number): boolean {
  if (!Number.isInteger(memoryId) || memoryId < 1) {
    throw new Error("Memory requires a valid id.");
  }

  const result = getDb().prepare("DELETE FROM memories WHERE id = ?").run(memoryId);

  return result.changes > 0;
}

export function updateCommitmentStatus(memoryId: number, status: MemoryStatus): Memory | null {
  if (!Number.isInteger(memoryId) || memoryId < 1) {
    throw new Error("Memory requires a valid id.");
  }

  validateMemoryStatus(status);
  const database = getDb();
  database.prepare("UPDATE memories SET status = ? WHERE id = ? AND kind = 'commitment'").run(status, memoryId);
  const row = database
    .prepare(`
      SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
      FROM memories
      WHERE id = ? AND kind = 'commitment'
    `)
    .get(memoryId) as MemoryRow | undefined;

  return row ? mapMemory(row) : null;
}

export function listOpenCommitments(limit = 50): MemoryWithSource[] {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = getDb()
    .prepare(`
      SELECT
        m.id AS memory_id,
        m.source_item_id,
        m.kind,
        m.content AS memory_content,
        m.confidence,
        m.rationale,
        m.metadata_json,
        m.status,
        m.created_at AS memory_created_at,
        s.id AS source_id,
        s.content AS source_content,
        s.source_type,
        s.created_at AS source_created_at
      FROM memories m
      JOIN source_items s ON s.id = m.source_item_id
      WHERE m.kind = 'commitment' AND m.status = 'active'
      ORDER BY datetime(m.created_at) DESC, m.id DESC
      LIMIT ?
    `)
    .all(safeLimit) as MemoryWithSourceRow[];

  return rows.map(mapMemoryWithSource);
}
