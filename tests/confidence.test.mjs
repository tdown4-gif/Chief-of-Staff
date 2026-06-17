import assert from "node:assert/strict";
import test from "node:test";

const baseMemory = {
  id: 1,
  sourceItemId: 1,
  kind: "person",
  content: "Mike",
  confidence: 84,
  rationale: "The source says Ty met Mike.",
  metadataJson: null,
  status: "active",
  createdAt: "2026-06-17T12:00:00.000Z"
};

const baseSource = {
  id: 1,
  content: "Met Mike. Insurance agency owner.",
  sourceType: "text",
  createdAt: "2026-06-17T12:00:00.000Z"
};

test("extraction confidence labels avoid fake precision", async () => {
  const { getExtractionConfidence } = await import("../lib/confidence.ts");

  assert.deepEqual(getExtractionConfidence({ ...baseMemory, confidence: 95 }), {
    label: "high",
    tone: "high",
    explanation: "Strong source-backed extraction signal."
  });

  assert.deepEqual(getExtractionConfidence({ ...baseMemory, confidence: 89 }), {
    label: "medium",
    tone: "medium",
    explanation: "Source-backed extraction with enough signal, but still worth scanning."
  });

  assert.deepEqual(getExtractionConfidence({ ...baseMemory, confidence: 84, status: "needs_review" }), {
    label: "needs review",
    tone: "review",
    explanation: "Weak or default extraction signal; confirm before relying on it."
  });
});

test("retrieval confidence is separate from extraction confidence", async () => {
  const { getRecallConfidence } = await import("../lib/confidence.ts");

  assert.deepEqual(
    getRecallConfidence({
      source: baseSource,
      memory: { ...baseMemory, confidence: 95 },
      sourceSnippet: "Met Mike. Insurance agency owner.",
      score: 4,
      resultType: "memory"
    }),
    {
      label: "high",
      tone: "high",
      explanation: "Structured memory matched the query and includes source proof."
    }
  );

  assert.deepEqual(
    getRecallConfidence({
      source: baseSource,
      memory: null,
      sourceSnippet: "Met Mike. Insurance agency owner.",
      score: 2,
      resultType: "raw_fallback"
    }),
    {
      label: "low",
      tone: "low",
      explanation: "No strong structured memory matched; this is a raw source fallback."
    }
  );
});
