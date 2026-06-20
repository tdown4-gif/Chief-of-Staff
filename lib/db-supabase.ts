import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateMemoryInput,
  CreateResearchQueueItemInput,
  CreateRecallFeedbackInput,
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
  SourceItem
} from "./db-types.ts";

type SourceItemRow = {
  id: number | string;
  content: string;
  source_type: string;
  created_at: string;
};

type MemoryRow = {
  id: number | string;
  source_item_id: number | string;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadata_json: unknown;
  status: MemoryStatus;
  created_at: string;
};

type MemoryWithSourceRow = MemoryRow & {
  source: SourceItemRow;
};

type RecallFeedbackRow = {
  id: number | string;
  query: string;
  action: RecallFeedbackAction;
  source_item_id: number | string;
  memory_id: number | string | null;
  note: string | null;
  created_at: string;
};

type ResearchQueueItemRow = {
  id: number | string;
  source_item_id: number | string | null;
  memory_id: number | string | null;
  status: ResearchQueueStatus;
  created_at: string;
};

type SupabaseMemoryInsert = {
  source_item_id: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadata_json: unknown;
  status: MemoryStatus;
  created_at: string;
};

const memoryStatuses = new Set<MemoryStatus>(["active", "needs_review", "done", "dismissed"]);
const recallFeedbackActions = new Set<RecallFeedbackAction>(["not_relevant", "promote_to_memory", "add_context"]);

let client: SupabaseClient | undefined;
let currentConfig: string | undefined;

function getConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, serviceRoleKey, key: `${url}:${serviceRoleKey}` };
}

function getClient() {
  const config = getConfig();
  if (!client || currentConfig !== config.key) {
    client = createClient(config.url, config.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    currentConfig = config.key;
  }

  return client;
}

function asNumber(value: number | string | null): number {
  return Number(value);
}

function metadataToJsonString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function metadataFromJsonString(value: string | null | undefined): unknown {
  if (!value) {
    return null;
  }

  return JSON.parse(value);
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
    metadataJson: metadataToJsonString(row.metadata_json),
    status: row.status,
    createdAt: String(row.created_at)
  };
}

function mapMemoryWithSource(row: MemoryWithSourceRow): MemoryWithSource {
  return {
    memory: mapMemory(row),
    source: mapSourceItem(row.source)
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

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
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

function memoryInsertFromInput(input: CreateMemoryInput): SupabaseMemoryInsert {
  validateMemoryInput(input);
  return {
    source_item_id: input.sourceItemId,
    kind: input.kind,
    content: input.content,
    confidence: input.confidence,
    rationale: input.rationale,
    metadata_json: metadataFromJsonString(input.metadataJson),
    status: input.status ?? "active",
    created_at: new Date().toISOString()
  };
}

function safeLimit(limit: number, max: number) {
  return Math.min(Math.max(limit, 1), max);
}

export const supabaseDatabase: MemoryDatabase = {
  async createSourceItem(content, sourceType = "text") {
    if (!content.trim()) {
      throw new Error("Capture cannot be empty.");
    }

    const createdAt = new Date().toISOString();
    const { data, error } = await getClient()
      .from("source_items")
      .insert({ content, source_type: sourceType, created_at: createdAt })
      .select("id, content, source_type, created_at")
      .single();
    throwIfError(error);

    return mapSourceItem(data as SourceItemRow);
  },

  async listRecentSourceItems(limit = 20) {
    const { data, error } = await getClient()
      .from("source_items")
      .select("id, content, source_type, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit(limit, 1000));
    throwIfError(error);

    return (data ?? []).map((row) => mapSourceItem(row as SourceItemRow));
  },

  async countSourceItems() {
    const { count, error } = await getClient()
      .from("source_items")
      .select("id", { count: "exact", head: true });
    throwIfError(error);

    return count ?? 0;
  },

  async createMemory(input) {
    const rows = [memoryInsertFromInput(input)];
    const { data, error } = await getClient()
      .from("memories")
      .insert(rows)
      .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at")
      .single();
    throwIfError(error);

    return mapMemory(data as MemoryRow);
  },

  async createMemories(inputs) {
    if (inputs.length === 0) {
      return [];
    }

    const rows = inputs.map(memoryInsertFromInput);
    const { data, error } = await getClient()
      .from("memories")
      .insert(rows)
      .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at");
    throwIfError(error);

    return (data ?? []).map((row) => mapMemory(row as MemoryRow));
  },

  async listMemoriesForSource(sourceItemId) {
    const { data, error } = await getClient()
      .from("memories")
      .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at")
      .eq("source_item_id", sourceItemId)
      .order("id", { ascending: false });
    throwIfError(error);

    return (data ?? []).map((row) => mapMemory(row as MemoryRow));
  },

  async listMemoriesForSources(sourceItemIds) {
    const safeIds = [...new Set(sourceItemIds.filter((id) => Number.isInteger(id) && id > 0))];
    const memoriesBySource: MemoriesBySourceId = Object.fromEntries(safeIds.map((id) => [id, []]));
    if (safeIds.length === 0) {
      return memoriesBySource;
    }

    const { data, error } = await getClient()
      .from("memories")
      .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at")
      .in("source_item_id", safeIds)
      .order("source_item_id", { ascending: true })
      .order("id", { ascending: false });
    throwIfError(error);

    for (const memory of (data ?? []).map((row) => mapMemory(row as MemoryRow))) {
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
    const { data, error } = await getClient()
      .from("memories")
      .update({ status })
      .eq("id", memoryId)
      .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at")
      .single();
    throwIfError(error);

    return mapMemory(data as MemoryRow);
  },

  async updateMemoryContent(memoryId, content) {
    if (!Number.isInteger(memoryId) || memoryId < 1) {
      throw new Error("Memory requires a valid id.");
    }

    const normalizedContent = content.trim().replace(/\s+/g, " ");
    if (!normalizedContent) {
      throw new Error("Memory content cannot be empty.");
    }

    const { data, error } = await getClient()
      .from("memories")
      .update({ content: normalizedContent })
      .eq("id", memoryId)
      .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at")
      .single();
    throwIfError(error);

    return mapMemory(data as MemoryRow);
  },

  async deleteMemory(memoryId) {
    if (!Number.isInteger(memoryId) || memoryId < 1) {
      throw new Error("Memory requires a valid id.");
    }

    const { count, error } = await getClient()
      .from("memories")
      .delete({ count: "exact" })
      .eq("id", memoryId);
    throwIfError(error);

    return (count ?? 0) > 0;
  },

  async updateCommitmentStatus(memoryId, status) {
    if (!Number.isInteger(memoryId) || memoryId < 1) {
      throw new Error("Memory requires a valid id.");
    }

    validateMemoryStatus(status);
    const { data, error } = await getClient()
      .from("memories")
      .update({ status })
      .eq("id", memoryId)
      .eq("kind", "commitment")
      .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at")
      .maybeSingle();
    throwIfError(error);

    return data ? mapMemory(data as MemoryRow) : null;
  },

  async listOpenCommitments(limit = 50) {
    const { data, error } = await getClient()
      .from("memories")
      .select(
        "id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at, source:source_items!inner(id, content, source_type, created_at)"
      )
      .eq("kind", "commitment")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit(limit, 100));
    throwIfError(error);

    return (data ?? []).map((row) => mapMemoryWithSource(row as unknown as MemoryWithSourceRow));
  },

  async listRecentMemoriesByKind(kind, limit = 10) {
    const { data, error } = await getClient()
      .from("memories")
      .select(
        "id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at, source:source_items!inner(id, content, source_type, created_at)"
      )
      .eq("kind", kind)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit(limit, 100));
    throwIfError(error);

    return (data ?? []).map((row) => mapMemoryWithSource(row as unknown as MemoryWithSourceRow));
  },

  async listMemoriesNeedingReview(limit = 10) {
    const { data, error } = await getClient()
      .from("memories")
      .select(
        "id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at, source:source_items!inner(id, content, source_type, created_at)"
      )
      .eq("status", "needs_review")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit(limit, 100));
    throwIfError(error);

    return (data ?? []).map((row) => mapMemoryWithSource(row as unknown as MemoryWithSourceRow));
  },

  async createResearchQueueItem(input) {
    validateResearchQueueItemInput(input);
    const createdAt = new Date().toISOString();
    const { data, error } = await getClient()
      .from("research_queue_items")
      .insert({
        source_item_id: input.sourceItemId ?? null,
        memory_id: input.memoryId ?? null,
        status: "queued",
        created_at: createdAt
      })
      .select("id, source_item_id, memory_id, status, created_at")
      .single();
    throwIfError(error);

    return mapResearchQueueItem(data as ResearchQueueItemRow);
  },

  async listResearchQueueItems(limit = 20) {
    const { data, error } = await getClient()
      .from("research_queue_items")
      .select("id, source_item_id, memory_id, status, created_at")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit(limit, 100));
    throwIfError(error);

    const queueItems = (data ?? []).map((row) => mapResearchQueueItem(row as ResearchQueueItemRow));
    if (queueItems.length === 0) {
      return [];
    }

    const memoryIds = [...new Set(queueItems.flatMap((item) => (item.memoryId ? [item.memoryId] : [])))];
    const { data: memoryRows, error: memoriesError } = memoryIds.length > 0
      ? await getClient()
        .from("memories")
        .select("id, source_item_id, kind, content, confidence, rationale, metadata_json, status, created_at")
        .in("id", memoryIds)
      : { data: [], error: null };
    throwIfError(memoriesError);

    const memoriesById = new Map((memoryRows ?? []).map((row) => {
      const memory = mapMemory(row as MemoryRow);
      return [memory.id, memory] as const;
    }));

    const sourceIds = [
      ...new Set(
        queueItems.flatMap((item) => {
          if (item.sourceItemId) {
            return [item.sourceItemId];
          }
          const memory = item.memoryId ? memoriesById.get(item.memoryId) : null;
          return memory ? [memory.sourceItemId] : [];
        })
      )
    ];
    const { data: sourceRows, error: sourcesError } = sourceIds.length > 0
      ? await getClient()
        .from("source_items")
        .select("id, content, source_type, created_at")
        .in("id", sourceIds)
      : { data: [], error: null };
    throwIfError(sourcesError);

    const sourcesById = new Map((sourceRows ?? []).map((row) => {
      const source = mapSourceItem(row as SourceItemRow);
      return [source.id, source] as const;
    }));

    return queueItems.flatMap((researchQueueItem): ResearchQueueItemWithContext[] => {
      const memory = researchQueueItem.memoryId ? memoriesById.get(researchQueueItem.memoryId) ?? null : null;
      const sourceId = researchQueueItem.sourceItemId ?? memory?.sourceItemId ?? null;
      const source = sourceId ? sourcesById.get(sourceId) : null;
      return source ? [{ researchQueueItem, source, memory }] : [];
    });
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

    const createdAt = new Date().toISOString();
    const { data, error } = await getClient()
      .from("recall_feedback")
      .insert({
        query,
        action: input.action,
        source_item_id: input.sourceItemId,
        memory_id: input.memoryId ?? null,
        note,
        created_at: createdAt
      })
      .select("id, query, action, source_item_id, memory_id, note, created_at")
      .single();
    throwIfError(error);

    return mapRecallFeedback(data as RecallFeedbackRow);
  },

  async listRecallFeedback(limit = 50) {
    const { data, error } = await getClient()
      .from("recall_feedback")
      .select("id, query, action, source_item_id, memory_id, note, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit(limit, 500));
    throwIfError(error);

    return (data ?? []).map((row) => mapRecallFeedback(row as RecallFeedbackRow));
  }
};
