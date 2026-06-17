export type RecallViewState = "idle" | "results" | "no-results";

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
