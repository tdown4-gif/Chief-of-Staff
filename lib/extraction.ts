import { createMemory, type Memory, type MemoryKind, type SourceItem } from "./db.ts";

export type ExplicitDate = {
  text: string;
  isoDate: string | null;
};

export type MemoryDraft = {
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadata?: {
    explicitDates?: ExplicitDate[];
  };
};

export type MemoryExtractor = {
  extract(source: SourceItem): Promise<MemoryDraft[]> | MemoryDraft[];
};

const monthNumbers: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12"
};

const monthPattern = Object.keys(monthNumbers).join("|");
const fullDatePattern = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2}),\\s*(\\d{4})\\b`, "gi");
const monthYearPattern = new RegExp(`\\b(${monthPattern})\\s+(\\d{4})\\b`, "gi");
const isoDatePattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

function normalizeFragment(fragment: string): string {
  return fragment.trim().replace(/\s+/g, " ").replace(/[.。]+$/, "");
}

function splitIntoFragments(content: string): string[] {
  return content
    .split(/\n+|(?<=[.!?])\s+/)
    .map(normalizeFragment)
    .filter(Boolean);
}

function buildMetadata(fragment: string): MemoryDraft["metadata"] | undefined {
  const explicitDates = extractExplicitDates(fragment);
  return explicitDates.length > 0 ? { explicitDates } : undefined;
}

function extractExplicitDates(text: string): ExplicitDate[] {
  const dates: ExplicitDate[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(fullDatePattern)) {
    const month = monthNumbers[match[1].toLowerCase()];
    const day = match[2].padStart(2, "0");
    const year = match[3];
    const isoDate = `${year}-${month}-${day}`;
    if (!seen.has(match[0])) {
      dates.push({ text: match[0], isoDate });
      seen.add(match[0]);
    }
  }

  for (const match of text.matchAll(isoDatePattern)) {
    if (!seen.has(match[0])) {
      dates.push({ text: match[0], isoDate: match[0] });
      seen.add(match[0]);
    }
  }

  for (const match of text.matchAll(monthYearPattern)) {
    if (!seen.has(match[0])) {
      const month = monthNumbers[match[1].toLowerCase()];
      dates.push({ text: match[0], isoDate: `${match[2]}-${month}` });
      seen.add(match[0]);
    }
  }

  return dates;
}

function makeDraft(
  kind: MemoryKind,
  content: string,
  confidence: number,
  rationale: string,
  fragment: string
): MemoryDraft {
  return {
    kind,
    content: normalizeFragment(content),
    confidence,
    rationale,
    metadata: buildMetadata(fragment)
  };
}

function extractPersonDrafts(fragments: string[]): MemoryDraft[] {
  const drafts: MemoryDraft[] = [];
  const seen = new Set<string>();
  const personPattern = /\b(?:met|meet|spoke with|talked to|call with|intro to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/gi;

  for (const fragment of fragments) {
    for (const match of fragment.matchAll(personPattern)) {
      const person = match[1].trim();
      if (seen.has(person)) {
        continue;
      }

      drafts.push(
        makeDraft(
          "person",
          person,
          84,
          `Deterministic fallback matched a direct person phrase in the source: "${match[0]}".`,
          fragment
        )
      );
      seen.add(person);
    }
  }

  return drafts;
}

function extractIdeaDraft(fragment: string): MemoryDraft | null {
  const ideaMatch = fragment.match(/^(?:(.+?)\s+)?idea:\s*(.+)$/i);
  if (!ideaMatch) {
    return null;
  }

  const label = ideaMatch[1]?.trim();
  const idea = label ? `${label} idea: ${ideaMatch[2]}` : ideaMatch[2];
  return makeDraft("idea", idea, 88, "Deterministic fallback matched an explicit idea label.", fragment);
}

function extractProjectDraft(fragment: string): MemoryDraft | null {
  const namedProjectMatch = fragment.match(/^(.+?)\s+project:\s*(.+)$/i);
  if (namedProjectMatch) {
    return makeDraft(
      "project",
      `${namedProjectMatch[1]}: ${namedProjectMatch[2]}`,
      86,
      "Deterministic fallback matched an explicit project label.",
      fragment
    );
  }

  const projectMatch = fragment.match(/^project:\s*(.+)$/i);
  if (!projectMatch) {
    return null;
  }

  return makeDraft("project", projectMatch[1], 86, "Deterministic fallback matched an explicit project label.", fragment);
}

function extractCommitmentDraft(fragment: string): MemoryDraft | null {
  if (!/\b(need to|follow up|follow-up|owe|promised to|remember to)\b/i.test(fragment)) {
    return null;
  }

  return makeDraft(
    "commitment",
    fragment,
    92,
    "Deterministic fallback matched commitment language in the source.",
    fragment
  );
}

export const deterministicFallbackExtractor: MemoryExtractor = {
  extract(source: SourceItem): MemoryDraft[] {
    const fragments = splitIntoFragments(source.content);
    const drafts = [...extractPersonDrafts(fragments)];

    for (const fragment of fragments) {
      const ideaDraft = extractIdeaDraft(fragment);
      if (ideaDraft) {
        drafts.push(ideaDraft);
      }

      const projectDraft = extractProjectDraft(fragment);
      if (projectDraft) {
        drafts.push(projectDraft);
      }

      const commitmentDraft = extractCommitmentDraft(fragment);
      if (commitmentDraft) {
        drafts.push(commitmentDraft);
      }
    }

    return drafts;
  }
};

export function createDefaultExtractor(): MemoryExtractor {
  return deterministicFallbackExtractor;
}

export async function extractMemoryDrafts(
  source: SourceItem,
  extractor: MemoryExtractor = createDefaultExtractor()
): Promise<MemoryDraft[]> {
  return extractor.extract(source);
}

function normalizeDraft(draft: MemoryDraft): MemoryDraft | null {
  const content = normalizeFragment(draft.content);
  const rationale = normalizeFragment(draft.rationale);
  const confidence = Math.round(draft.confidence);

  if (!content || !rationale || !Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
    return null;
  }

  return {
    kind: draft.kind,
    content,
    confidence,
    rationale,
    metadata: draft.metadata
  };
}

export async function extractAndStoreMemoriesForSource(
  source: SourceItem,
  extractor: MemoryExtractor = createDefaultExtractor()
): Promise<{ memories: Memory[]; error: string | null }> {
  try {
    const drafts = await extractMemoryDrafts(source, extractor);
    const memories = drafts.flatMap((draft) => {
      const normalizedDraft = normalizeDraft(draft);
      if (!normalizedDraft) {
        return [];
      }

      return [
        createMemory({
          sourceItemId: source.id,
          kind: normalizedDraft.kind,
          content: normalizedDraft.content,
          confidence: normalizedDraft.confidence,
          rationale: normalizedDraft.rationale,
          metadataJson: normalizedDraft.metadata ? JSON.stringify(normalizedDraft.metadata) : null
        })
      ];
    });

    return { memories, error: null };
  } catch (error) {
    return { memories: [], error: error instanceof Error ? error.message : "Extraction failed." };
  }
}
