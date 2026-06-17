import {
  listMemoriesForSources,
  listRecentSourceItems,
  type MemoriesBySourceId,
  type Memory,
  type MemoryKind,
  type MemoryStatus,
  type SourceItem
} from "./db.ts";

export type RecallResult = {
  source: SourceItem;
  memory: Memory | null;
  sourceSnippet: string;
  score: number;
};

export type RecallDependencies = {
  listRecentSourceItems: (limit?: number) => SourceItem[];
  listMemoriesForSources: (sourceItemIds: number[]) => MemoriesBySourceId;
};

export type RecallOptions = {
  kinds?: MemoryKind[];
  statuses?: MemoryStatus[];
  includeRawSources?: boolean;
};

const defaultRecallDependencies: RecallDependencies = {
  listRecentSourceItems,
  listMemoriesForSources
};

const RECALL_SOURCE_WINDOW = 1000;

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

function expandQueryTokens(question: string): string[] {
  const tokens = tokenize(question);
  const normalizedQuestion = question.toLowerCase();

  if (/\b(forgetting|forgot|forget|owe|open loops?)\b/.test(normalizedQuestion)) {
    tokens.push("commitment", "need", "follow", "remember", "owe", "promised");
  }

  return tokens;
}

function tokenVariants(token: string): string[] {
  const variants = new Set([token]);

  if (token.length > 4 && token.endsWith("ies")) {
    variants.add(`${token.slice(0, -3)}y`);
  }

  if (token.length > 4 && token.endsWith("es")) {
    variants.add(token.slice(0, -2));
  }

  if (token.length > 3 && token.endsWith("s")) {
    variants.add(token.slice(0, -1));
  }

  return [...variants];
}

function countMatches(text: string, queryTokens: string[]): number {
  const searchable = text.toLowerCase();
  return queryTokens.reduce(
    (score, token) => (tokenVariants(token).some((variant) => searchable.includes(variant)) ? score + 1 : score),
    0
  );
}

function buildSourceSnippet(sourceContent: string, queryTokens: string[], maxLength = 220): string {
  const normalized = sourceContent.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  const firstMatch = queryTokens
    .flatMap(tokenVariants)
    .map((token) => lower.indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, firstMatch - 70);
  const end = Math.min(normalized.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalized.length ? "..." : "";

  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

function memoryMatchesOptions(memory: Memory, options: Required<RecallOptions>): boolean {
  return options.kinds.includes(memory.kind) && options.statuses.includes(memory.status);
}

function normalizeOptions(options: RecallOptions = {}): Required<RecallOptions> {
  return {
    kinds: options.kinds?.length ? [...new Set(options.kinds)] : ["person", "project", "idea", "commitment"],
    statuses: options.statuses?.length ? [...new Set(options.statuses)] : ["active"],
    includeRawSources: options.includeRawSources ?? true
  };
}

export function recall(
  question: string,
  limit = 10,
  dependencies: RecallDependencies = defaultRecallDependencies,
  options: RecallOptions = {}
): RecallResult[] {
  const queryTokens = Array.from(new Set(expandQueryTokens(question)));
  if (queryTokens.length === 0) {
    return [];
  }

  const normalizedOptions = normalizeOptions(options);
  const sources = dependencies.listRecentSourceItems(RECALL_SOURCE_WINDOW);
  const memoriesBySource = dependencies.listMemoriesForSources(sources.map((source) => source.id));
  const results = sources.flatMap<RecallResult>((source) => {
    const memories = memoriesBySource[source.id] ?? [];
    const sourceScore = countMatches(source.content, queryTokens);
    let filteredOutMemoryMatched = false;
    const memoryResults = memories.flatMap<RecallResult>((memory) => {
      const memoryText = `${memory.kind} ${memory.content} ${memory.rationale}`;
      const memoryScore = countMatches(memoryText, queryTokens);
      if (!memoryMatchesOptions(memory, normalizedOptions)) {
        filteredOutMemoryMatched ||= memoryScore > 0;
        return [];
      }

      const score = sourceScore + memoryScore * 2;

      return score > 0
        ? [{ source, memory, sourceSnippet: buildSourceSnippet(source.content, [...queryTokens, ...tokenize(memory.content)]), score }]
        : [];
    });

    if (memoryResults.length > 0) {
      return memoryResults;
    }

    return normalizedOptions.includeRawSources && !filteredOutMemoryMatched && sourceScore > 0
      ? [{ source, memory: null, sourceSnippet: buildSourceSnippet(source.content, queryTokens), score: sourceScore }]
      : [];
  });

  return results.sort((a, b) => b.score - a.score || b.source.id - a.source.id).slice(0, Math.max(1, limit));
}
