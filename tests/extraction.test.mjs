import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-extraction-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("deterministic fallback proposes v0 memory drafts with explicit date metadata", async () => {
  const { extractMemoryDrafts } = await import("../lib/extraction.ts");
  const source = {
    id: 42,
    content:
      "Met Mike. Insurance agency owner.\n" +
      "Idea: AI tool for insurance agencies that remembers renewal dates and suggests outreach.\n" +
      "Palms AI project: turn messy founder notes into structured venture briefs.\n" +
      "Need to follow up with Sarah about pricing after the demo on July 12, 2026.",
    sourceType: "text",
    createdAt: "2026-06-16T12:00:00.000Z"
  };

  const drafts = await extractMemoryDrafts(source);

  assert.ok(drafts.some((draft) => draft.kind === "person" && draft.content.includes("Mike")));
  assert.ok(drafts.some((draft) => draft.kind === "idea" && draft.content.includes("insurance agencies")));
  assert.ok(drafts.some((draft) => draft.kind === "project" && draft.content.includes("Palms AI")));
  assert.ok(drafts.some((draft) => draft.kind === "commitment" && draft.content.includes("follow up with Sarah")));
  assert.ok(drafts.every((draft) => draft.confidence >= 0 && draft.confidence <= 100));
  assert.ok(drafts.every((draft) => draft.rationale.length > 0));

  const datedDraft = drafts.find((draft) =>
    draft.metadata?.explicitDates?.some((date) => date.text === "July 12, 2026" && date.isoDate === "2026-07-12")
  );
  assert.ok(datedDraft, "expected explicit date metadata on a proposed memory");
});

test("deterministic fallback extracts only properly capitalized person names", async () => {
  const { extractMemoryDrafts } = await import("../lib/extraction.ts");
  const source = {
    id: 43,
    content: "Met Sarah Chen and spoke with John about the demo.",
    sourceType: "text",
    createdAt: "2026-06-16T12:00:00.000Z"
  };

  const drafts = await extractMemoryDrafts(source);
  const people = drafts.filter((draft) => draft.kind === "person").map((draft) => draft.content);

  assert.deepEqual(people, ["Sarah Chen", "John"]);
});

test("deterministic fallback does not invent people from lowercase nouns/pronouns", async () => {
  const { extractMemoryDrafts } = await import("../lib/extraction.ts");
  const source = {
    id: 7,
    content: "Need to meet the vendor about pricing. Spoke with everyone on the team.",
    sourceType: "text",
    createdAt: "2026-06-16T12:00:00.000Z"
  };

  const drafts = await extractMemoryDrafts(source);

  assert.ok(!drafts.some((draft) => draft.kind === "person"), "should not propose person memories here");
});

test("deterministic fallback does not turn follow-up nouns into commitments", async () => {
  const { extractMemoryDrafts } = await import("../lib/extraction.ts");
  const source = {
    id: 9,
    content: "Met Mike. Insurance agency owner. Interested in AI workflows for renewals and customer follow-up.",
    sourceType: "text",
    createdAt: "2026-06-16T12:00:00.000Z"
  };

  const drafts = await extractMemoryDrafts(source);

  assert.ok(drafts.some((draft) => draft.kind === "person" && draft.content === "Mike"));
  assert.ok(!drafts.some((draft) => draft.kind === "commitment"), "customer follow-up is context, not an obligation");
});

test("deterministic fallback still extracts explicit follow-up commitments", async () => {
  const { extractMemoryDrafts } = await import("../lib/extraction.ts");
  const source = {
    id: 10,
    content: "Follow up with Sarah about pricing after the demo.",
    sourceType: "text",
    createdAt: "2026-06-16T12:00:00.000Z"
  };

  const drafts = await extractMemoryDrafts(source);

  assert.ok(drafts.some((draft) => draft.kind === "commitment" && draft.content.includes("Sarah about pricing")));
});

test("deterministic fallback ignores benign source text", async () => {
  const { extractMemoryDrafts } = await import("../lib/extraction.ts");
  const source = {
    id: 8,
    content: "Reorganized the garage and watched a movie.",
    sourceType: "text",
    createdAt: "2026-06-16T12:00:00.000Z"
  };

  const drafts = await extractMemoryDrafts(source);

  assert.deepEqual(drafts, []);
});

test("extraction stores source-backed memories and isolates extractor failures", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const extractionModule = await import("../lib/extraction.ts");
  const source = dbModule.createSourceItem(
    "Need to follow up with Sarah about pricing after the demo on July 12, 2026.",
    "text"
  );

  const result = await extractionModule.extractAndStoreMemoriesForSource(source, {
    extract: () => [
      {
        kind: "commitment",
        content: "Follow up with Sarah about pricing after the demo",
        confidence: 95,
        rationale: "The source says Ty needs to follow up with Sarah.",
        metadata: {
          explicitDates: [{ text: "July 12, 2026", isoDate: "2026-07-12" }]
        }
      }
    ]
  });

  assert.equal(result.error, null);
  assert.equal(result.memories.length, 1);
  assert.equal(result.memories[0].sourceItemId, source.id);
  assert.equal(result.memories[0].kind, "commitment");
  assert.equal(result.memories[0].confidence, 95);
  assert.match(result.memories[0].metadataJson, /2026-07-12/);

  const failure = await extractionModule.extractAndStoreMemoriesForSource(source, {
    extract: () => {
      throw new Error("extractor unavailable");
    }
  });

  assert.equal(failure.memories.length, 0);
  assert.equal(failure.error, "extractor unavailable");
  assert.equal(dbModule.listMemoriesForSource(source.id).length, 1);
});

test("extraction marks low-confidence or weak memory drafts as needs_review", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const extractionModule = await import("../lib/extraction.ts");
  const source = dbModule.createSourceItem("Met Mike. Insurance agency owner.", "text");

  const result = await extractionModule.extractAndStoreMemoriesForSource(source, {
    extract: () => [
      {
        kind: "person",
        content: "Mike",
        confidence: 84,
        rationale: "The source says Ty met Mike."
      },
      {
        kind: "commitment",
        content: "Follow up with Mike",
        confidence: 92,
        rationale: "The source says Ty needs to follow up with Mike."
      }
    ]
  });

  assert.equal(result.error, null);
  assert.deepEqual(
    result.memories.map((memory) => ({ kind: memory.kind, status: memory.status })),
    [
      { kind: "person", status: "needs_review" },
      { kind: "commitment", status: "active" }
    ]
  );
});
