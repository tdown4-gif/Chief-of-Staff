import { SOURCE_TYPES, type CaptureSourceType } from "./capture.ts";
import type { RecallOptions } from "./recall.ts";

export type RecallViewState = "idle" | "results" | "no-results";
export type RecallKindFilter = "all" | "person" | "project" | "idea" | "commitment";
export type RecallStatusFilter = "active" | "needs_review" | "done" | "dismissed";
export type RecallSourceTypeFilter = "all" | CaptureSourceType;

type RecallFilterParams = {
  kind?: string;
  status?: string;
  sourceType?: string;
};

const recallKinds = new Set<RecallKindFilter>(["all", "person", "project", "idea", "commitment"]);
const recallStatuses = new Set<RecallStatusFilter>(["active", "needs_review", "done", "dismissed"]);
const recallSourceTypes = new Set<RecallSourceTypeFilter>(["all", ...SOURCE_TYPES]);

export function getRecallViewState(query: string, resultCount: number): RecallViewState {
  if (!query.trim()) {
    return "idle";
  }

  return resultCount > 0 ? "results" : "no-results";
}

export function formatRecallResultsHeading(query: string, resultCount: number): string {
  const normalizedQuery = query.trim();
  const noun = resultCount === 1 ? "result" : "results";

  return `${resultCount} source-backed ${noun} for "${normalizedQuery}"`;
}

export function parseRecallFilters(params: RecallFilterParams): {
  selectedKind: RecallKindFilter;
  selectedStatus: RecallStatusFilter;
  selectedSourceType: RecallSourceTypeFilter;
  options: RecallOptions;
} {
  const selectedKind = recallKinds.has(params.kind as RecallKindFilter) ? (params.kind as RecallKindFilter) : "all";
  const selectedStatus = recallStatuses.has(params.status as RecallStatusFilter)
    ? (params.status as RecallStatusFilter)
    : "active";
  const selectedSourceType = recallSourceTypes.has(params.sourceType as RecallSourceTypeFilter)
    ? (params.sourceType as RecallSourceTypeFilter)
    : "all";

  return {
    selectedKind,
    selectedStatus,
    selectedSourceType,
    options: {
      ...(selectedKind === "all" ? {} : { kinds: [selectedKind] }),
      ...(selectedSourceType === "all" ? {} : { sourceTypes: [selectedSourceType] }),
      statuses: selectedStatus === "active" ? ["active", "needs_review"] : [selectedStatus]
    }
  };
}
