import type { Memory } from "./db.ts";
import type { RecallResult } from "./recall.ts";

export type ConfidenceLabel = "high" | "medium" | "low" | "needs review";
export type ConfidenceTone = "high" | "medium" | "low" | "review";

export type ConfidencePresentation = {
  label: ConfidenceLabel;
  tone: ConfidenceTone;
  explanation: string;
};

export function getExtractionConfidence(memory: Memory): ConfidencePresentation {
  if (memory.status === "needs_review" || memory.confidence < 88) {
    return {
      label: "needs review",
      tone: "review",
      explanation: "Weak or default extraction signal; confirm before relying on it."
    };
  }

  if (memory.confidence >= 92) {
    return {
      label: "high",
      tone: "high",
      explanation: "Strong source-backed extraction signal."
    };
  }

  return {
    label: "medium",
    tone: "medium",
    explanation: "Source-backed extraction with enough signal, but still worth scanning."
  };
}

export function getRecallConfidence(result: RecallResult): ConfidencePresentation {
  if (result.resultType === "raw_fallback") {
    return {
      label: "low",
      tone: "low",
      explanation: "No strong structured memory matched; this is a raw source fallback."
    };
  }

  if (result.resultType === "raw") {
    return {
      label: "medium",
      tone: "medium",
      explanation: "Raw source text matched the query; no extracted memory is attached."
    };
  }

  if (result.resultType === "needs_review") {
    return {
      label: "needs review",
      tone: "review",
      explanation: "The match is source-backed but the extracted memory needs confirmation."
    };
  }

  return {
    label: "high",
    tone: "high",
    explanation: "Structured memory matched the query and includes source proof."
  };
}

export function confidenceBadgeClass(tone: ConfidenceTone): string {
  if (tone === "review") {
    return "badge badge-review";
  }

  if (tone === "low") {
    return "badge badge-low";
  }

  if (tone === "medium") {
    return "badge badge-medium";
  }

  return "badge badge-high";
}
