export type SourceItem = {
  id: number;
  content: string;
  sourceType: string;
  createdAt: string;
};

export type MemoryKind = "person" | "project" | "idea" | "commitment";
export type MemoryStatus = "active" | "needs_review" | "done" | "dismissed";
export type RecallFeedbackAction = "not_relevant" | "promote_to_memory" | "add_context";

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
  createSourceItem(content: string, sourceType?: string): SourceItem;
  listRecentSourceItems(limit?: number): SourceItem[];
  countSourceItems(): number;
  createMemory(input: CreateMemoryInput): Memory;
  createMemories(inputs: CreateMemoryInput[]): Memory[];
  listMemoriesForSource(sourceItemId: number): Memory[];
  listMemoriesForSources(sourceItemIds: number[]): MemoriesBySourceId;
  updateMemoryStatus(memoryId: number, status: MemoryStatus): Memory;
  updateMemoryContent(memoryId: number, content: string): Memory;
  deleteMemory(memoryId: number): boolean;
  updateCommitmentStatus(memoryId: number, status: MemoryStatus): Memory | null;
  listOpenCommitments(limit?: number): MemoryWithSource[];
  listMemoriesNeedingReview(limit?: number): MemoryWithSource[];
  createRecallFeedback(input: CreateRecallFeedbackInput): RecallFeedback;
  listRecallFeedback(limit?: number): RecallFeedback[];
};
