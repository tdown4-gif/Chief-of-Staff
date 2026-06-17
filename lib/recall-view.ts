import type { RecallOptions } from "./recall.ts";

export type RecallViewState = "idle" | "results" | "no-results";
export type RecallKindFilter = "all" | "person" | "project" | "idea" | "commitment";
export type RecallStatusFilter = "active" | "done" | "dismissed";

type RecallFilterParams = {
  kind?: string;
  status?: string;
};

const recallKinds = new Set<RecallKindFilter>(["all", "person", "project", "idea", "commitment"]);
const recallStatuses = new Set<RecallStatusFilter>(["active", "done", "dismissed"]);

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
  options: RecallOptions;
} {
  const selectedKind = recallKinds.has(params.kind as RecallKindFilter) ? (params.kind as RecallKindFilter) : "all";
  const selectedStatus = recallStatuses.has(params.status as RecallStatusFilter)
    ? (params.status as RecallStatusFilter)
    : "active";

  return {
    selectedKind,
    selectedStatus,
    options: {
      ...(selectedKind === "all" ? {} : { kinds: [selectedKind] }),
      statuses: [selectedStatus]
    }
  };
}
