import { createClient, type Client } from "@libsql/client";
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

const memoryStatuses = new Set<MemoryStatus>(["active", "needs_review", "done", "dismissed"]);
const recallFeedbackActions = new Set<RecallFeedbackAction>(["not_relevant", "promote_to_memory", "add_context"]);

let client: Client | undefined;
let initialized = false;
let currentConfig: string | undefined;

function getConfig() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error("Turso/libSQL requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
  }

  return { url, authToken, key: `${url}:${authToken}` };
}

function getClient() {
  const config = getConfig();
  if (!client || currentConfig !== config.key) {
    client = createClient({ url: config.url, authToken: config.authToken });
    currentConfig = config.key;
    initialized = false;
  }

  return client;
}

async function ensureSchema() {
  const database = getClient();
  if (initialized) {
    return database;
  }

  await database.batch([
    `CREATE TABLE IF NOT EXISTS source_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS memories (
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
    )`,
    `CREATE TABLE IF NOT EXISTS recall_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('not_relevant', 'promote_to_memory', 'add_context')),
      source_item_id INTEGER NOT NULL,
      memory_id INTEGER,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS research_queue_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_item_id INTEGER,
      memory_id INTEGER,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'done', 'dismissed')),
      created_at TEXT NOT NULL,
      CHECK (source_item_id IS NOT NULL OR memory_id IS NOT NULL),
      FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS youtube_sources (
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
    )`,
    "CREATE INDEX IF NOT EXISTS idx_memories_source_item_id ON memories(source_item_id)",
    "CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind)",
    "CREATE INDEX IF NOT EXISTS idx_recall_feedback_source_item_id ON recall_feedback(source_item_id)",
    "CREATE INDEX IF NOT EXISTS idx_research_queue_items_source_item_id ON research_queue_items(source_item_id)",
    "CREATE INDEX IF NOT EXISTS idx_research_queue_items_memory_id ON research_queue_items(memory_id)",
    "CREATE INDEX IF NOT EXISTS idx_youtube_sources_video_id ON youtube_sources(video_id)"
  ]);

  const memoryColumns = await database.execute("PRAGMA table_info(memories)");
  if (!memoryColumns.rows.some((column) => column.name === "status")) {
    await database.execute(`
      ALTER TABLE memories
      ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'done', 'dismissed'))
    `);
  }

  initialized = true;
  return database;
}

function asNumber(value: unknown): number {
  return typeof value === "bigint" ? Number(value) : Number(value);
}

function mapSourceItem(row: SourceItemRow): SourceItem {
  return {
    id: asNumber(row.id),
    content: String(row.content),
    sourceType: String(row.source_type),
    createdAt: String(row.created_at)
  };
}

function mapMemory(row: MemoryRow): Memory {
  return {
    id: asNumber(row.id),
    sourceItemId: asNumber(row.source_item_id),
    kind: row.kind,
    content: String(row.content),
    confidence: asNumber(row.confidence),
    rationale: String(row.rationale),
    metadataJson: row.metadata_json,
    status: row.status,
    createdAt: String(row.created_at)
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
    id: asNumber(row.id),
    query: String(row.query),
    action: row.action,
    sourceItemId: asNumber(row.source_item_id),
    memoryId: row.memory_id == null ? null : asNumber(row.memory_id),
    note: row.note,
    createdAt: String(row.created_at)
  };
}

function mapResearchQueueItem(row: ResearchQueueItemRow): ResearchQueueItem {
  return {
    id: asNumber(row.id),
    sourceItemId: row.source_item_id == null ? null : asNumber(row.source_item_id),
    memoryId: row.memory_id == null ? null : asNumber(row.memory_id),
    status: row.status,
    createdAt: String(row.created_at)
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
    id: asNumber(row.id),
    sourceItemId: asNumber(row.source_item_id),
    url: String(row.url),
    videoId: String(row.video_id),
    title: row.title,
    channel: row.channel,
    transcriptStatus: row.transcript_status,
    summary: row.summary,
    createdAt: String(row.created_at)
  };
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

async function insertMemory(database: Client, input: CreateMemoryInput): Promise<Memory> {
  validateMemoryInput(input);
  const createdAt = new Date().toISOString();
  const result = await database.execute({
    sql: `
      INSERT INTO memories (source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      input.sourceItemId,
      input.kind,
      input.content,
      input.confidence,
      input.rationale,
      input.metadataJson ?? null,
      input.status ?? "active",
      createdAt
    ]
  });

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

export const libsqlDatabase: MemoryDatabase = {
  async createSourceItem(content, sourceType = "text") {
    if (!content.trim()) {
      throw new Error("Capture cannot be empty.");
    }

    const database = await ensureSchema();
    const createdAt = new Date().toISOString();
    const result = await database.execute({
      sql: "INSERT INTO source_items (content, source_type, created_at) VALUES (?, ?, ?)",
      args: [content, sourceType, createdAt]
    });

    return {
      id: Number(result.lastInsertRowid),
      content,
      sourceType,
      createdAt
    };
  },

  async listRecentSourceItems(limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 1000);
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: "SELECT id, content, source_type, created_at FROM source_items ORDER BY datetime(created_at) DESC, id DESC LIMIT ?",
      args: [safeLimit]
    });

    return rows.rows.map((row) => mapSourceItem(row as unknown as SourceItemRow));
  },

  async countSourceItems() {
    const database = await ensureSchema();
    const row = (await database.execute("SELECT COUNT(*) as count FROM source_items")).rows[0] as unknown as { count: number };
    return asNumber(row.count);
  },

  async createMemory(input) {
    return insertMemory(await ensureSchema(), input);
  },

  async createMemories(inputs) {
    const database = await ensureSchema();
    await database.execute("BEGIN");
    try {
      const memories: Memory[] = [];
      for (const input of inputs) {
        memories.push(await insertMemory(database, input));
      }
      await database.execute("COMMIT");
      return memories;
    } catch (error) {
      await database.execute("ROLLBACK");
      throw error;
    }
  },

  async listMemoriesForSource(sourceItemId) {
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
        SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
        FROM memories
        WHERE source_item_id = ?
        ORDER BY id DESC
      `,
      args: [sourceItemId]
    });

    return rows.rows.map((row) => mapMemory(row as unknown as MemoryRow));
  },

  async listMemoriesForSources(sourceItemIds) {
    const safeIds = [...new Set(sourceItemIds.filter((id) => Number.isInteger(id) && id > 0))];
    const memoriesBySource: MemoriesBySourceId = Object.fromEntries(safeIds.map((id) => [id, []]));
    if (safeIds.length === 0) {
      return memoriesBySource;
    }

    const placeholders = safeIds.map(() => "?").join(", ");
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
        SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
        FROM memories
        WHERE source_item_id IN (${placeholders})
        ORDER BY source_item_id ASC, id DESC
      `,
      args: safeIds
    });

    for (const memory of rows.rows.map((row) => mapMemory(row as unknown as MemoryRow))) {
      memoriesBySource[memory.sourceItemId] ??= [];
      memoriesBySource[memory.sourceItemId].push(memory);
    }

    return memoriesBySource;
  },

  async updateMemoryStatus(memoryId, status) {
    if (!Number.isInteger(memoryId) || memoryId < 1) {
      throw new Error("Memory requires a valid id.");
    }

    validateMemoryStatus(status);
    const database = await ensureSchema();
    await database.execute({ sql: "UPDATE memories SET status = ? WHERE id = ?", args: [status, memoryId] });
    const row = (
      await database.execute({
        sql: `
          SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
          FROM memories
          WHERE id = ?
        `,
        args: [memoryId]
      })
    ).rows[0] as unknown as MemoryRow | undefined;

    if (!row) {
      throw new Error("Memory not found.");
    }

    return mapMemory(row);
  },

  async updateMemoryContent(memoryId, content) {
    if (!Number.isInteger(memoryId) || memoryId < 1) {
      throw new Error("Memory requires a valid id.");
    }

    const normalizedContent = content.trim().replace(/\s+/g, " ");
    if (!normalizedContent) {
      throw new Error("Memory content cannot be empty.");
    }

    const database = await ensureSchema();
    await database.execute({ sql: "UPDATE memories SET content = ? WHERE id = ?", args: [normalizedContent, memoryId] });
    const row = (
      await database.execute({
        sql: `
          SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
          FROM memories
          WHERE id = ?
        `,
        args: [memoryId]
      })
    ).rows[0] as unknown as MemoryRow | undefined;

    if (!row) {
      throw new Error("Memory not found.");
    }

    return mapMemory(row);
  },

  async deleteMemory(memoryId) {
    if (!Number.isInteger(memoryId) || memoryId < 1) {
      throw new Error("Memory requires a valid id.");
    }

    const database = await ensureSchema();
    const result = await database.execute({ sql: "DELETE FROM memories WHERE id = ?", args: [memoryId] });
    return result.rowsAffected > 0;
  },

  async updateCommitmentStatus(memoryId, status) {
    if (!Number.isInteger(memoryId) || memoryId < 1) {
      throw new Error("Memory requires a valid id.");
    }

    validateMemoryStatus(status);
    const database = await ensureSchema();
    await database.execute({
      sql: "UPDATE memories SET status = ? WHERE id = ? AND kind = 'commitment'",
      args: [status, memoryId]
    });
    const row = (
      await database.execute({
        sql: `
          SELECT id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at
          FROM memories
          WHERE id = ? AND kind = 'commitment'
        `,
        args: [memoryId]
      })
    ).rows[0] as unknown as MemoryRow | undefined;

    return row ? mapMemory(row) : null;
  },

  async listOpenCommitments(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
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
      `,
      args: [safeLimit]
    });

    return rows.rows.map((row) => mapMemoryWithSource(row as unknown as MemoryWithSourceRow));
  },

  async listRecentMemoriesByKind(kind, limit = 10) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
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
      `,
      args: [kind, safeLimit]
    });

    return rows.rows.map((row) => mapMemoryWithSource(row as unknown as MemoryWithSourceRow));
  },

  async listMemoriesNeedingReview(limit = 10) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
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
      `,
      args: [safeLimit]
    });

    return rows.rows.map((row) => mapMemoryWithSource(row as unknown as MemoryWithSourceRow));
  },

  async createYouTubeSource(input) {
    validateYouTubeSourceInput(input);
    const database = await ensureSchema();
    const createdAt = new Date().toISOString();
    await database.execute({
      sql: `
        INSERT INTO youtube_sources (source_item_id, url, video_id, title, channel, transcript_status, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_item_id) DO UPDATE SET
          url = excluded.url,
          video_id = excluded.video_id,
          title = excluded.title,
          channel = excluded.channel,
          transcript_status = excluded.transcript_status,
          summary = excluded.summary
      `,
      args: [
        input.sourceItemId,
        input.url,
        input.videoId,
        input.title ?? null,
        input.channel ?? null,
        input.transcriptStatus,
        input.summary ?? null,
        createdAt
      ]
    });

    const row = (
      await database.execute({
        sql: `
          SELECT id, source_item_id, url, video_id, title, channel, transcript_status, summary, created_at
          FROM youtube_sources
          WHERE source_item_id = ?
        `,
        args: [input.sourceItemId]
      })
    ).rows[0] as unknown as YouTubeSourceRow | undefined;

    if (!row) {
      throw new Error("YouTube source not found.");
    }

    return mapYouTubeSource(row);
  },

  async listYouTubeSourcesForSources(sourceItemIds) {
    const safeIds = [...new Set(sourceItemIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (safeIds.length === 0) {
      return {};
    }

    const placeholders = safeIds.map(() => "?").join(", ");
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
        SELECT id, source_item_id, url, video_id, title, channel, transcript_status, summary, created_at
        FROM youtube_sources
        WHERE source_item_id IN (${placeholders})
        ORDER BY id DESC
      `,
      args: safeIds
    });

    return Object.fromEntries(
      rows.rows.map((row) => {
        const youtubeSource = mapYouTubeSource(row as unknown as YouTubeSourceRow);
        return [youtubeSource.sourceItemId, youtubeSource];
      })
    ) as YouTubeSourcesBySourceId;
  },

  async createResearchQueueItem(input) {
    validateResearchQueueItemInput(input);
    const database = await ensureSchema();
    const createdAt = new Date().toISOString();
    const result = await database.execute({
      sql: `
        INSERT INTO research_queue_items (source_item_id, memory_id, status, created_at)
        VALUES (?, ?, 'queued', ?)
      `,
      args: [input.sourceItemId ?? null, input.memoryId ?? null, createdAt]
    });

    return {
      id: Number(result.lastInsertRowid),
      sourceItemId: input.sourceItemId ?? null,
      memoryId: input.memoryId ?? null,
      status: "queued",
      createdAt
    };
  },

  async listResearchQueueItems(limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
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
      `,
      args: [safeLimit]
    });

    return rows.rows.map((row) => mapResearchQueueItemWithContext(row as unknown as ResearchQueueItemWithContextRow));
  },

  async createRecallFeedback(input: CreateRecallFeedbackInput) {
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

    const database = await ensureSchema();
    const createdAt = new Date().toISOString();
    const result = await database.execute({
      sql: `
        INSERT INTO recall_feedback (query, action, source_item_id, memory_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [query, input.action, input.sourceItemId, input.memoryId ?? null, note, createdAt]
    });

    return {
      id: Number(result.lastInsertRowid),
      query,
      action: input.action,
      sourceItemId: input.sourceItemId,
      memoryId: input.memoryId ?? null,
      note,
      createdAt
    };
  },

  async listRecallFeedback(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const database = await ensureSchema();
    const rows = await database.execute({
      sql: `
        SELECT id, query, action, source_item_id, memory_id, note, created_at
        FROM recall_feedback
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `,
      args: [safeLimit]
    });

    return rows.rows.map((row) => mapRecallFeedback(row as unknown as RecallFeedbackRow));
  }
};
