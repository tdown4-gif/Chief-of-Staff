import {
  listMemoriesForSources,
  listRecentSourceItems,
  listYouTubeSourcesForSources,
  type MemoriesBySourceId,
  type Memory,
  type MemoryKind,
  type MemoryStatus,
  type SourceItem,
  type YouTubeSource,
  type YouTubeSourcesBySourceId
} from "./db.ts";

export type RecallResult = {
  source: SourceItem;
  memory: Memory | null;
  youtubeSource: YouTubeSource | null;
  sourceSnippet: string;
  score: number;
  resultType: "memory" | "needs_review" | "raw" | "raw_fallback";
};

export type RecallDependencies = {
  listRecentSourceItems: (limit?: number) => Promise<SourceItem[]> | SourceItem[];
  listMemoriesForSources: (sourceItemIds: number[]) => Promise<MemoriesBySourceId> | MemoriesBySourceId;
  listYouTubeSourcesForSources?: (sourceItemIds: number[]) => Promise<YouTubeSourcesBySourceId> | YouTubeSourcesBySourceId;
};

export type RecallOptions = {
  kinds?: MemoryKind[];
  statuses?: MemoryStatus[];
  sourceTypes?: string[];
  includeRawSources?: boolean;
};

const defaultRecallDependencies: RecallDependencies = {
  listRecentSourceItems,
  listMemoriesForSources,
  listYouTubeSourcesForSources
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
  "doing",
  "for",
  "floating",
  "from",
  "guy",
  "have",
  "i",
  "in",
  "is",
  "made",
  "met",
  "me",
  "mentioned",
  "my",
  "of",
  "once",
  "on",
  "not",
  "recently",
  "said",
  "say",
  "that",
  "the",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
  "yet"
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

function inferMemoryKinds(question: string): MemoryKind[] | null {
  const normalizedQuestion = question.toLowerCase();

  if (/\b(forgetting|forgot|forget|owe|open loops?|commitments?)\b/.test(normalizedQuestion)) {
    return ["commitment"];
  }

  if (/\bideas?\b/.test(normalizedQuestion)) {
    return ["idea"];
  }

  if (/\bwho\b/.test(normalizedQuestion)) {
    return ["person"];
  }

  if (/\bprojects?\b/.test(normalizedQuestion)) {
    return ["project"];
  }

  return null;
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

function countSourceMatches(source: SourceItem, queryTokens: string[]): number {
  return countMatches(`${source.sourceType} ${source.content}`, queryTokens);
}

function buildYouTubeSearchText(youtubeSource: YouTubeSource | null): string {
  if (!youtubeSource) {
    return "";
  }

  return [
    "youtube",
    youtubeSource.url,
    youtubeSource.videoId,
    youtubeSource.title,
    youtubeSource.channel,
    youtubeSource.tyNote,
    youtubeSource.transcriptStatus
  ].filter(Boolean).join(" ");
}

function buildYouTubeSnippet(source: SourceItem, youtubeSource: YouTubeSource | null, queryTokens: string[]): string {
  if (!youtubeSource) {
    return buildSourceSnippet(source.content, queryTokens);
  }

  return buildSourceSnippet(
    [
      youtubeSource.title ? `Video: ${youtubeSource.title}` : null,
      youtubeSource.channel ? `Channel: ${youtubeSource.channel}` : null,
      `URL: ${youtubeSource.url}`,
      youtubeSource.tyNote ? `Why I saved this: ${youtubeSource.tyNote}` : null,
      `Source proof: ${source.content}`
    ].filter(Boolean).join(" | "),
    queryTokens
  );
}

const GENERIC_RECALL_TOKENS = new Set([
  "ai",
  "business",
  "captured",
  "commitment",
  "commitments",
  "forgetting",
  "follow",
  "idea",
  "ideas",
  "need",
  "owe",
  "person",
  "people",
  "promised",
  "remember"
]);

function selectRequiredQueryTokens(queryTokens: string[]): string[] {
  return queryTokens.filter((token) => !GENERIC_RECALL_TOKENS.has(token));
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
  const kinds: MemoryKind[] = options.kinds?.length
    ? [...new Set(options.kinds)]
    : ["person", "project", "idea", "commitment"];

  return {
    kinds,
    statuses: options.statuses?.length ? [...new Set(options.statuses)] : ["active", "needs_review"],
    sourceTypes: options.sourceTypes?.length ? [...new Set(options.sourceTypes)] : [],
    includeRawSources: options.includeRawSources ?? !options.kinds?.length
  };
}

function memoryResultType(memory: Memory): RecallResult["resultType"] {
  return memory.status === "needs_review" || memory.confidence < 88 ? "needs_review" : "memory";
}

export async function recall(
  question: string,
  limit = 10,
  dependencies: RecallDependencies = defaultRecallDependencies,
  options: RecallOptions = {}
): Promise<RecallResult[]> {
  const queryTokens = Array.from(new Set(expandQueryTokens(question)));
  if (queryTokens.length === 0) {
    return [];
  }

  const inferredKinds = options.kinds?.length ? null : inferMemoryKinds(question);
  const normalizedOptions = normalizeOptions(inferredKinds ? { ...options, kinds: inferredKinds } : options);
  const requiredQueryTokens = selectRequiredQueryTokens(queryTokens);
  const sources = await dependencies.listRecentSourceItems(RECALL_SOURCE_WINDOW);
  const sourceIds = sources.map((source) => source.id);
  const [memoriesBySource, youtubeSourcesBySource] = await Promise.all([
    dependencies.listMemoriesForSources(sourceIds),
    (dependencies.listYouTubeSourcesForSources ?? listYouTubeSourcesForSources)(sourceIds)
  ]);
  const rawFallbackResults: RecallResult[] = [];
  const results = sources.flatMap<RecallResult>((source) => {
    if (normalizedOptions.sourceTypes.length > 0 && !normalizedOptions.sourceTypes.includes(source.sourceType)) {
      return [];
    }

    const memories = memoriesBySource[source.id] ?? [];
    const youtubeSource = youtubeSourcesBySource[source.id] ?? null;
    const youtubeSearchText = buildYouTubeSearchText(youtubeSource);
    const sourceScore = countSourceMatches(source, queryTokens) + countMatches(youtubeSearchText, queryTokens);
    let filteredOutMemoryMatched = false;
    const memoryResults = memories.flatMap<RecallResult>((memory) => {
      const memoryText = `${memory.kind} ${memory.content} ${memory.rationale}`;
      const memoryScore = countMatches(memoryText, queryTokens);
      const requiredScore = countMatches(`${source.content} ${memoryText}`, requiredQueryTokens);
      if (!memoryMatchesOptions(memory, normalizedOptions)) {
        filteredOutMemoryMatched ||= memoryScore > 0;
        return [];
      }

      if (requiredQueryTokens.length > 0 && requiredScore === 0) {
        return [];
      }

      const score = sourceScore + memoryScore * 2;

      return score > 0
        ? [
            {
              source,
              memory,
              youtubeSource,
              sourceSnippet: youtubeSource
                ? buildYouTubeSnippet(source, youtubeSource, [...queryTokens, ...tokenize(memory.content)])
                : buildSourceSnippet(source.content, [...queryTokens, ...tokenize(memory.content)]),
              score,
              resultType: memoryResultType(memory)
            }
          ]
        : [];
    });

    if (memoryResults.length > 0) {
      return memoryResults;
    }

    const rawMatches =
      !filteredOutMemoryMatched &&
      sourceScore > 0 &&
      (
        requiredQueryTokens.length === 0 ||
        countSourceMatches(source, requiredQueryTokens) + countMatches(youtubeSearchText, requiredQueryTokens) > 0
      );

    if (!rawMatches) {
      return [];
    }

    const rawResult: RecallResult = {
      source,
      memory: null,
      youtubeSource,
      sourceSnippet: buildYouTubeSnippet(source, youtubeSource, queryTokens),
      score: sourceScore,
      resultType: normalizedOptions.includeRawSources ? "raw" : "raw_fallback"
    };

    if (normalizedOptions.includeRawSources) {
      return [rawResult];
    }

    if (inferredKinds) {
      rawFallbackResults.push(rawResult);
    }

    return [];
  });

  const candidateResults = results.length > 0 ? results : rawFallbackResults;

  return candidateResults.sort((a, b) => b.score - a.score || b.source.id - a.source.id).slice(0, Math.max(1, limit));
}
