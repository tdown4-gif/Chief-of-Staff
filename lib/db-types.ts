export type SourceItem = {
  id: number;
  content: string;
  sourceType: string;
  createdAt: string;
};

export type MemoryKind = "person" | "project" | "idea" | "commitment";
export type MemoryStatus = "active" | "needs_review" | "done" | "dismissed";
export type RecallFeedbackAction = "not_relevant" | "promote_to_memory" | "add_context";
export type ResearchQueueStatus = "queued" | "done" | "dismissed";

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

export type ResearchQueueItem = {
  id: number;
  sourceItemId: number | null;
  memoryId: number | null;
  status: ResearchQueueStatus;
  createdAt: string;
};

export type ResearchQueueItemWithContext = {
  researchQueueItem: ResearchQueueItem;
  source: SourceItem;
  memory: Memory | null;
};

export type CreateResearchQueueItemInput = {
  sourceItemId?: number | null;
  memoryId?: number | null;
};

export type RecallFeedback = {
  id: number;
  query: string;
  action: RecallFeedbackAction;
  sourceItemId: number;
  memoryId: number | null;
  note: string | null;
  createdAt: string;
};

export type CreateRecallFeedbackInput = {
  query: string;
  action: RecallFeedbackAction;
  sourceItemId: number;
  memoryId?: number | null;
  note?: string | null;
};

export type MemoryDatabase = {
  createSourceItem(content: string, sourceType?: string): Promise<SourceItem>;
  listRecentSourceItems(limit?: number): Promise<SourceItem[]>;
  countSourceItems(): Promise<number>;
  createMemory(input: CreateMemoryInput): Promise<Memory>;
  createMemories(inputs: CreateMemoryInput[]): Promise<Memory[]>;
  listMemoriesForSource(sourceItemId: number): Promise<Memory[]>;
  listMemoriesForSources(sourceItemIds: number[]): Promise<MemoriesBySourceId>;
  updateMemoryStatus(memoryId: number, status: MemoryStatus): Promise<Memory>;
  updateMemoryContent(memoryId: number, content: string): Promise<Memory>;
  deleteMemory(memoryId: number): Promise<boolean>;
  updateCommitmentStatus(memoryId: number, status: MemoryStatus): Promise<Memory | null>;
  listOpenCommitments(limit?: number): Promise<MemoryWithSource[]>;
  listRecentMemoriesByKind(kind: MemoryKind, limit?: number): Promise<MemoryWithSource[]>;
  listMemoriesNeedingReview(limit?: number): Promise<MemoryWithSource[]>;
  createResearchQueueItem(input: CreateResearchQueueItemInput): Promise<ResearchQueueItem>;
  listResearchQueueItems(limit?: number): Promise<ResearchQueueItemWithContext[]>;
  createRecallFeedback(input: CreateRecallFeedbackInput): Promise<RecallFeedback>;
  listRecallFeedback(limit?: number): Promise<RecallFeedback[]>;
};
