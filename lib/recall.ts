import { listMemoriesForSource, listRecentSourceItems, type Memory, type SourceItem } from "./db.ts";

export type RecallResult = {
  source: SourceItem;
  memory: Memory | null;
  sourceSnippet: string;
  score: number;
};

const STOP_WORDS = new Set([
  "a",
  "about",
  "am",
  "an",
  "and",
  "are",
  "did",
  "do",
  "for",
  "from",
  "guy",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "who",
  "with"
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 1 && !STOP_WORDS.has(token)) ?? [];
}

function countMatches(text: string, queryTokens: string[]): number {
  const searchable = text.toLowerCase();
  return queryTokens.reduce((score, token) => (searchable.includes(token) ? score + 1 : score), 0);
}

function buildSourceSnippet(sourceContent: string, queryTokens: string[], maxLength = 220): string {
  const normalized = sourceContent.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  const firstMatch = queryTokens.map((token) => lower.indexOf(token)).find((index) => index >= 0) ?? 0;
  const start = Math.max(0, firstMatch - 70);
  const end = Math.min(normalized.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalized.length ? "..." : "";

  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

export function recall(question: string, limit = 10): RecallResult[] {
  const queryTokens = Array.from(new Set(tokenize(question)));
  if (queryTokens.length === 0) {
    return [];
  }

  const sources = listRecentSourceItems(100);
  const results = sources.flatMap<RecallResult>((source) => {
    const memories = listMemoriesForSource(source.id);
    const sourceScore = countMatches(source.content, queryTokens);
    const sourceSnippet = buildSourceSnippet(source.content, queryTokens);
    const memoryResults = memories.flatMap<RecallResult>((memory) => {
      const memoryText = `${memory.kind} ${memory.content} ${memory.rationale}`;
      const memoryScore = countMatches(memoryText, queryTokens);
      const score = sourceScore + memoryScore * 2;

      return score > 0 ? [{ source, memory, sourceSnippet, score }] : [];
    });

    if (memoryResults.length > 0) {
      return memoryResults;
    }

    return sourceScore > 0 ? [{ source, memory: null, sourceSnippet, score: sourceScore }] : [];
  });

  return results.sort((a, b) => b.score - a.score || b.source.id - a.source.id).slice(0, Math.max(1, limit));
}
