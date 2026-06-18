import { libsqlDatabase } from "./db-libsql.ts";
import { localSqliteDatabase } from "./db-local.ts";
import { supabaseDatabase } from "./db-supabase.ts";
import type {
  CreateMemoryInput,
  CreateRecallFeedbackInput,
  MemoryDatabase,
  MemoryStatus
} from "./db-types.ts";

export type {
  CreateMemoryInput,
  CreateRecallFeedbackInput,
  MemoriesBySourceId,
  Memory,
  MemoryDatabase,
  MemoryKind,
  MemoryStatus,
  MemoryWithSource,
  RecallFeedback,
  RecallFeedbackAction,
  SourceItem
} from "./db-types.ts";

function getDatabase(): MemoryDatabase {
  if (process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return supabaseDatabase;
  }

  if (process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN?.trim()) {
    return libsqlDatabase;
  }

  return localSqliteDatabase;
}

export function getDatabaseAdapterKind(): "local-sqlite" | "libsql" | "supabase" {
  if (process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return "supabase";
  }

  if (process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN?.trim()) {
    return "libsql";
  }

  return "local-sqlite";
}

export const createSourceItem = (...args: Parameters<MemoryDatabase["createSourceItem"]>) =>
  getDatabase().createSourceItem(...args);

export const listRecentSourceItems = (...args: Parameters<MemoryDatabase["listRecentSourceItems"]>) =>
  getDatabase().listRecentSourceItems(...args);

export const countSourceItems = (...args: Parameters<MemoryDatabase["countSourceItems"]>) =>
  getDatabase().countSourceItems(...args);

export const createMemory = (input: CreateMemoryInput) => getDatabase().createMemory(input);

export const createMemories = (...args: Parameters<MemoryDatabase["createMemories"]>) =>
  getDatabase().createMemories(...args);

export const listMemoriesForSource = (...args: Parameters<MemoryDatabase["listMemoriesForSource"]>) =>
  getDatabase().listMemoriesForSource(...args);

export const listMemoriesForSources = (...args: Parameters<MemoryDatabase["listMemoriesForSources"]>) =>
  getDatabase().listMemoriesForSources(...args);

export const updateMemoryStatus = (memoryId: number, status: MemoryStatus) =>
  getDatabase().updateMemoryStatus(memoryId, status);

export const updateMemoryContent = (...args: Parameters<MemoryDatabase["updateMemoryContent"]>) =>
  getDatabase().updateMemoryContent(...args);

export const deleteMemory = (...args: Parameters<MemoryDatabase["deleteMemory"]>) =>
  getDatabase().deleteMemory(...args);

export const updateCommitmentStatus = (memoryId: number, status: MemoryStatus) =>
  getDatabase().updateCommitmentStatus(memoryId, status);

export const listOpenCommitments = (...args: Parameters<MemoryDatabase["listOpenCommitments"]>) =>
  getDatabase().listOpenCommitments(...args);

export const listMemoriesNeedingReview = (...args: Parameters<MemoryDatabase["listMemoriesNeedingReview"]>) =>
  getDatabase().listMemoriesNeedingReview(...args);

export const createRecallFeedback = (input: CreateRecallFeedbackInput) =>
  getDatabase().createRecallFeedback(input);

export const listRecallFeedback = (...args: Parameters<MemoryDatabase["listRecallFeedback"]>) =>
  getDatabase().listRecallFeedback(...args);
