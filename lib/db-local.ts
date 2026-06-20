import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type {
  CreateMemoryInput,
  CreateResearchQueueItemInput,
  CreateRecallFeedbackInput,
  CreateYouTubeSourceInput,
  MemoriesBySourceId,
  Memory,
  MemoryDatabase,
  MemoryKind,
  MemoryStatus,
  MemoryWithSource,
  RecallFeedback,
  RecallFeedbackAction,
  ResearchQueueItem,
  ResearchQueueItemWithContext,
  ResearchQueueStatus,
  SourceItem,
  YouTubeSource,
  YouTubeSourcesBySourceId,
  YouTubeTranscriptStatus
} from "./db-types.ts";

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

type RecallFeedbackRow = {
  id: number;
  query: string;
  action: RecallFeedbackAction;
  source_item_id: number;
  memory_id: number | null;
  note: string | null;
  created_at: string;
};

type ResearchQueueItemRow = {
  id: number;
  source_item_id: number | null;
  memory_id: number | null;
  status: ResearchQueueStatus;
  created_at: string;
};

type ResearchQueueItemWithContextRow = ResearchQueueItemRow & {
  source_id: number;
  source_content: string;
  source_type: string;
  source_created_at: string;
  memory_kind: MemoryKind | null;
  memory_content: string | null;
  memory_confidence: number | null;
  memory_rationale: string | null;
  memory_metadata_json: string | null;
  memory_status: MemoryStatus | null;
  memory_created_at: string | null;
};

type YouTubeSourceRow = {
  id: number;
  source_item_id: number;
  url: string;
  video_id: string;
  title: string | null;
  channel: string | null;
  transcript_status: YouTubeTranscriptStatus;
  summary: string | null;
  created_at: string;
};

const dataDir = path.join(process.cwd(), "data");
const memoryStatuses = new Set<MemoryStatus>(["active", "needs_review", "done", "dismissed"]);
const recallFeedbackActions = new Set<RecallFeedbackAction>(["not_relevant", "promote_to_memory", "add_context"]);

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
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'done', 'dismissed')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recall_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('not_relevant', 'promote_to_memory', 'add_context')),
        source_item_id INTEGER NOT NULL,
        memory_id INTEGER,
        note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS research_queue_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_item_id INTEGER,
        memory_id INTEGER,
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'done', 'dismissed')),
        created_at TEXT NOT NULL,
        CHECK (source_item_id IS NOT NULL OR memory_id IS NOT NULL),
        FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS youtube_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_item_id INTEGER NOT NULL UNIQUE,
        url TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT,
        channel TEXT,
        transcript_status TEXT NOT NULL DEFAULT 'unavailable' CHECK (transcript_status IN ('available', 'unavailable')),
        summary TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memories_source_item_id ON memories(source_item_id);
      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
      CREATE INDEX IF NOT EXISTS idx_recall_feedback_source_item_id ON recall_feedback(source_item_id);
      CREATE INDEX IF NOT EXISTS idx_research_queue_items_source_item_id ON research_queue_items(source_item_id);
      CREATE INDEX IF NOT EXISTS idx_research_queue_items_memory_id ON research_queue_items(memory_id);
      CREATE INDEX IF NOT EXISTS idx_youtube_sources_video_id ON youtube_sources(video_id);
    `);

    const memoryColumns = db.prepare("PRAGMA table_info(memories)").all() as Array<{ name: string }>;
    if (!memoryColumns.some((column) => column.name === "status")) {
      db.exec(`
        ALTER TABLE memories
        ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'done', 'dismissed'))
      `);
    }

    const memoryTable = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'memories'").get() as
      | { sql: string }
      | undefined;
    if (memoryTable?.sql && !memoryTable.sql.includes("needs_review")) {
      db.exec(`
        ALTER TABLE memories RENAME TO memories_old;
        CREATE TABLE memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_item_id INTEGER NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('person', 'project', 'idea', 'commitment')),
          content TEXT NOT NULL,
          confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
          rationale TEXT NOT NULL DEFAULT '',
          metadata_json TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'done', 'dismissed')),
          created_at TEXT NOT NULL,
          FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE
        );
        INSERT INTO memories (id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at)
        SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
        FROM memories_old;
        DROP TABLE memories_old;
        CREATE INDEX IF NOT EXISTS idx_memories_source_item_id ON memories(source_item_id);
        CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
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

function mapRecallFeedback(row: RecallFeedbackRow): RecallFeedback {
  return {
    id: row.id,
    query: row.query,
    action: row.action,
    sourceItemId: row.source_item_id,
    memoryId: row.memory_id,
    note: row.note,
    createdAt: row.created_at
  };
}

function mapResearchQueueItem(row: ResearchQueueItemRow): ResearchQueueItem {
  return {
    id: row.id,
    sourceItemId: row.source_item_id,
    memoryId: row.memory_id,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapResearchQueueItemWithContext(row: ResearchQueueItemWithContextRow): ResearchQueueItemWithContext {
  return {
    researchQueueItem: mapResearchQueueItem(row),
    source: mapSourceItem({
      id: row.source_id,
      content: row.source_content,
      source_type: row.source_type,
      created_at: row.source_created_at
    }),
    memory: row.memory_id && row.memory_kind && row.memory_content && row.memory_confidence != null && row.memory_rationale && row.memory_status && row.memory_created_at
      ? mapMemory({
        id: row.memory_id,
        source_item_id: row.source_item_id ?? row.source_id,
        kind: row.memory_kind,
        content: row.memory_content,
        confidence: row.memory_confidence,
        rationale: row.memory_rationale,
        metadata_json: row.memory_metadata_json,
        status: row.memory_status,
        created_at: row.memory_created_at
      })
      : null
  };
}

function mapYouTubeSource(row: YouTubeSourceRow): YouTubeSource {
  return {
    id: row.id,
    sourceItemId: row.source_item_id,
    url: row.url,
    videoId: row.video_id,
    title: row.title,
    channel: row.channel,
    transcriptStatus: row.transcript_status,
    summary: row.summary,
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

function validateYouTubeSourceInput(input: CreateYouTubeSourceInput) {
  if (!Number.isInteger(input.sourceItemId) || input.sourceItemId < 1) {
    throw new Error("YouTube source requires a valid source item.");
  }

  if (!input.url.trim()) {
    throw new Error("YouTube source requires a URL.");
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(input.videoId)) {
    throw new Error("YouTube source requires a valid video id.");
  }

  if (!["available", "unavailable"].includes(input.transcriptStatus)) {
    throw new Error("YouTube transcript status must be available or unavailable.");
  }
}

export function createYouTubeSource(input: CreateYouTubeSourceInput): YouTubeSource {
  validateYouTubeSourceInput(input);
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(`
      INSERT INTO youtube_sources (source_item_id, url, video_id, title, channel, transcript_status, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_item_id) DO UPDATE SET
        url = excluded.url,
        video_id = excluded.video_id,
        title = excluded.title,
        channel = excluded.channel,
        transcript_status = excluded.transcript_status,
        summary = excluded.summary
    `)
    .run(
      input.sourceItemId,
      input.url,
      input.videoId,
      input.title ?? null,
      input.channel ?? null,
      input.transcriptStatus,
      input.summary ?? null,
      createdAt
    );

  const row = getDb()
    .prepare(`
      SELECT id, source_item_id, url, video_id, title, channel, transcript_status, summary, created_at
      FROM youtube_sources
      WHERE source_item_id = ?
    `)
    .get(input.sourceItemId) as YouTubeSourceRow;

  return mapYouTubeSource(row);
}

export function listYouTubeSourcesForSources(sourceItemIds: number[]): YouTubeSourcesBySourceId {
  const safeIds = [...new Set(sourceItemIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (safeIds.length === 0) {
    return {};
  }

  const placeholders = safeIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`
      SELECT id, source_item_id, url, video_id, title, channel, transcript_status, summary, created_at
      FROM youtube_sources
      WHERE source_item_id IN (${placeholders})
      ORDER BY id DESC
    `)
    .all(...safeIds) as YouTubeSourceRow[];

  return Object.fromEntries(rows.map((row) => [row.source_item_id, mapYouTubeSource(row)]));
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
    throw new Error("Memory status must be active, needs_review, done, or dismissed.");
  }
}

function validateMemoryStatus(status: MemoryStatus) {
  if (!memoryStatuses.has(status)) {
    throw new Error("Memory status must be active, needs_review, done, or dismissed.");
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

export function listRecentMemoriesByKind(kind: MemoryKind, limit = 10): MemoryWithSource[] {
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
      WHERE m.kind = ? AND m.status = 'active'
      ORDER BY datetime(m.created_at) DESC, m.id DESC
      LIMIT ?
    `)
    .all(kind, safeLimit) as MemoryWithSourceRow[];

  return rows.map(mapMemoryWithSource);
}

export function listMemoriesNeedingReview(limit = 10): MemoryWithSource[] {
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
      WHERE m.status = 'needs_review'
      ORDER BY datetime(m.created_at) DESC, m.id DESC
      LIMIT ?
    `)
    .all(safeLimit) as MemoryWithSourceRow[];

  return rows.map(mapMemoryWithSource);
}

function validateResearchQueueItemInput(input: CreateResearchQueueItemInput) {
  const sourceItemId = input.sourceItemId ?? null;
  const memoryId = input.memoryId ?? null;

  if (sourceItemId == null && memoryId == null) {
    throw new Error("Research queue item requires a source item or memory.");
  }

  if (sourceItemId != null && (!Number.isInteger(sourceItemId) || sourceItemId < 1)) {
    throw new Error("Research queue item requires a valid source item.");
  }

  if (memoryId != null && (!Number.isInteger(memoryId) || memoryId < 1)) {
    throw new Error("Research queue item requires a valid memory.");
  }
}

export function createResearchQueueItem(input: CreateResearchQueueItemInput): ResearchQueueItem {
  validateResearchQueueItemInput(input);
  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare(`
      INSERT INTO research_queue_items (source_item_id, memory_id, status, created_at)
      VALUES (?, ?, 'queued', ?)
    `)
    .run(input.sourceItemId ?? null, input.memoryId ?? null, createdAt);

  return {
    id: Number(result.lastInsertRowid),
    sourceItemId: input.sourceItemId ?? null,
    memoryId: input.memoryId ?? null,
    status: "queued",
    createdAt
  };
}

export function listResearchQueueItems(limit = 20): ResearchQueueItemWithContext[] {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = getDb()
    .prepare(`
      SELECT
        r.id,
        r.source_item_id,
        r.memory_id,
        r.status,
        r.created_at,
        s.id AS source_id,
        s.content AS source_content,
        s.source_type,
        s.created_at AS source_created_at,
        m.kind AS memory_kind,
        m.content AS memory_content,
        m.confidence AS memory_confidence,
        m.rationale AS memory_rationale,
        m.metadata_json AS memory_metadata_json,
        m.status AS memory_status,
        m.created_at AS memory_created_at
      FROM research_queue_items r
      LEFT JOIN memories m ON m.id = r.memory_id
      JOIN source_items s ON s.id = COALESCE(r.source_item_id, m.source_item_id)
      WHERE r.status = 'queued'
      ORDER BY datetime(r.created_at) DESC, r.id DESC
      LIMIT ?
    `)
    .all(safeLimit) as ResearchQueueItemWithContextRow[];

  return rows.map(mapResearchQueueItemWithContext);
}

export function createRecallFeedback(input: CreateRecallFeedbackInput): RecallFeedback {
  const query = input.query.trim();
  const note = input.note?.trim() || null;
  if (!query) {
    throw new Error("Recall feedback requires a query.");
  }

  if (!recallFeedbackActions.has(input.action)) {
    throw new Error("Recall feedback requires a valid feedback action.");
  }

  if (!Number.isInteger(input.sourceItemId) || input.sourceItemId < 1) {
    throw new Error("Recall feedback requires a valid source item.");
  }

  if (input.memoryId != null && (!Number.isInteger(input.memoryId) || input.memoryId < 1)) {
    throw new Error("Recall feedback requires a valid memory id.");
  }

  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare(`
      INSERT INTO recall_feedback (query, action, source_item_id, memory_id, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(query, input.action, input.sourceItemId, input.memoryId ?? null, note, createdAt);

  return {
    id: Number(result.lastInsertRowid),
    query,
    action: input.action,
    sourceItemId: input.sourceItemId,
    memoryId: input.memoryId ?? null,
    note,
    createdAt
  };
}

export function listRecallFeedback(limit = 50): RecallFeedback[] {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const rows = getDb()
    .prepare(`
      SELECT id, query, action, source_item_id, memory_id, note, created_at
      FROM recall_feedback
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `)
    .all(safeLimit) as RecallFeedbackRow[];

  return rows.map(mapRecallFeedback);
}

export const localSqliteDatabase: MemoryDatabase = {
  async createSourceItem(content, sourceType) {
    return createSourceItem(content, sourceType);
  },
  async listRecentSourceItems(limit) {
    return listRecentSourceItems(limit);
  },
  async countSourceItems() {
    return countSourceItems();
  },
  async createYouTubeSource(input) {
    return createYouTubeSource(input);
  },
  async listYouTubeSourcesForSources(sourceItemIds) {
    return listYouTubeSourcesForSources(sourceItemIds);
  },
  async createMemory(input) {
    return createMemory(input);
  },
  async createMemories(inputs) {
    return createMemories(inputs);
  },
  async listMemoriesForSource(sourceItemId) {
    return listMemoriesForSource(sourceItemId);
  },
  async listMemoriesForSources(sourceItemIds) {
    return listMemoriesForSources(sourceItemIds);
  },
  async updateMemoryStatus(memoryId, status) {
    return updateMemoryStatus(memoryId, status);
  },
  async updateMemoryContent(memoryId, content) {
    return updateMemoryContent(memoryId, content);
  },
  async deleteMemory(memoryId) {
    return deleteMemory(memoryId);
  },
  async updateCommitmentStatus(memoryId, status) {
    return updateCommitmentStatus(memoryId, status);
  },
  async listOpenCommitments(limit) {
    return listOpenCommitments(limit);
  },
  async listRecentMemoriesByKind(kind, limit) {
    return listRecentMemoriesByKind(kind, limit);
  },
  async listMemoriesNeedingReview(limit) {
    return listMemoriesNeedingReview(limit);
  },
  async createResearchQueueItem(input) {
    return createResearchQueueItem(input);
  },
  async listResearchQueueItems(limit) {
    return listResearchQueueItems(limit);
  },
  async createRecallFeedback(input) {
    return createRecallFeedback(input);
  },
  async listRecallFeedback(limit) {
    return listRecallFeedback(limit);
  }
};
