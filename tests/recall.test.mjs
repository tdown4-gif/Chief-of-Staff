import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-recall-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("recall finds a memory through matching source context and returns source proof", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Met Mike. Insurance agency owner. Interested in AI workflows.", "text");

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "person",
    content: "Mike",
    confidence: 84,
    rationale: "The source says Ty met Mike."
  });

  const results = await recall("Who was the insurance guy?");

  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, source.id);
  assert.equal(results[0].memory?.kind, "person");
  assert.equal(results[0].memory?.content, "Mike");
  assert.match(results[0].sourceSnippet, /Insurance agency owner/);
  assert.ok(results[0].score > 0);
});

test("recall searches raw captures even when no memory has been extracted", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem(
    "Palms AI idea: turn messy founder notes into structured venture briefs.",
    "text"
  );

  const results = await recall("venture briefs");

  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, source.id);
  assert.equal(results[0].memory, null);
  assert.match(results[0].sourceSnippet, /venture briefs/);
});

test("recall includes raw source fallback when structured memory results are empty for an inferred kind", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Family reminder: Dad Medicare letter follow up. ask if he mailed forms.", "text");

  const results = await recall("What do I owe my dad about Medicare?");

  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, source.id);
  assert.equal(results[0].memory, null);
  assert.equal(results[0].resultType, "raw_fallback");
  assert.match(results[0].sourceSnippet, /Dad Medicare/);
});

test("recall labels low-confidence memory matches as review-needed", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Met Mike. Insurance agency owner.", "text");

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "person",
    content: "Mike",
    confidence: 84,
    rationale: "The source says Ty met Mike.",
    status: "needs_review"
  });

  const results = await recall("Who was insurance Mike?");

  assert.equal(results.length, 1);
  assert.equal(results[0].resultType, "needs_review");
  assert.equal(results[0].memory?.status, "needs_review");
});

test("recall can match source type when asking for links or documents", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const linkSource = dbModule.createSourceItem("Renewal workflow reference: https://example.com/renewals", "link");
  dbModule.createSourceItem("Renewal workflow summary copied from a call.", "note");

  const results = await recall("links about renewal workflow");

  assert.ok(results.length >= 1);
  assert.equal(results[0].source.id, linkSource.id);
  assert.equal(results[0].source.sourceType, "link");
});

test("recall can filter results to requested source types", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const linkSource = dbModule.createSourceItem("Renewal workflow reference: https://example.com/renewals", "link");
  dbModule.createSourceItem("Renewal workflow summary copied from a call.", "note");

  const results = await recall("renewal workflow", 10, undefined, { sourceTypes: ["link"] });

  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, linkSource.id);
  assert.equal(results[0].source.sourceType, "link");
});

test("recall handles plural memory-kind queries and centers source snippets on evidence", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const filler = "Background note. ".repeat(30);
  const source = dbModule.createSourceItem(
    `${filler}Need to follow up with Sarah about pricing after the demo on July 12, 2026.`,
    "text"
  );

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Follow up with Sarah about pricing after the demo",
    confidence: 92,
    rationale: "The source says Ty needs to follow up with Sarah."
  });

  const results = await recall("What commitments have I made recently?");

  assert.equal(results.length, 1);
  assert.equal(results[0].memory?.kind, "commitment");
  assert.match(results[0].sourceSnippet, /Need to follow up with Sarah/);
  assert.ok(results[0].sourceSnippet.startsWith("..."));
});

test("recall treats forgetting questions as active commitment recall", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Need to follow up with Sarah about pricing after the demo.", "text");

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Follow up with Sarah about pricing after the demo",
    confidence: 92,
    rationale: "The source says Ty needs to follow up with Sarah."
  });

  const results = await recall("What am I forgetting?");

  assert.equal(results.length, 1);
  assert.equal(results[0].memory?.kind, "commitment");
  assert.match(results[0].sourceSnippet, /Need to follow up with Sarah/);
});

test("forgetting recall still excludes dismissed commitments by default", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Need to send Sarah the pricing notes.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Send Sarah the pricing notes",
    confidence: 92,
    rationale: "The source says Ty needs to send Sarah notes."
  });

  dbModule.updateMemoryStatus(memory.id, "dismissed");

  assert.deepEqual(await recall("What am I forgetting?"), []);
});

test("recall fetches memories for recent sources in one batch", async () => {
  const { recall } = await import(`../lib/recall.ts?batch=${Date.now()}-${Math.random()}`);
  const createdAt = "2026-06-16T12:00:00.000Z";
  const sources = [
    {
      id: 1,
      content: "Met Mike. Insurance agency owner. Interested in AI workflows.",
      sourceType: "text",
      createdAt
    },
    {
      id: 2,
      content: "Archived receipts and cleaned the desktop.",
      sourceType: "text",
      createdAt
    }
  ];
  const memory = {
    id: 10,
    sourceItemId: 1,
    kind: "person",
    content: "Mike",
    confidence: 84,
    rationale: "The source says Ty met Mike.",
    metadataJson: null,
    status: "active",
    createdAt
  };
  let requestedSourceIds = [];

  const results = await recall("insurance", 10, {
    listRecentSourceItems: () => sources,
    listMemoriesForSources: (sourceIds) => {
      requestedSourceIds = sourceIds;
      return { 1: [memory], 2: [] };
    }
  });

  assert.deepEqual(requestedSourceIds, [1, 2]);
  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, 1);
  assert.equal(results[0].memory?.content, "Mike");
});

test("recall scans a thousand recent captures by default", async () => {
  const { recall } = await import(`../lib/recall.ts?window=${Date.now()}-${Math.random()}`);
  const createdAt = "2026-06-16T12:00:00.000Z";
  let requestedLimit = 0;

  const results = await recall("deep archive", 10, {
    listRecentSourceItems: (limit) => {
      requestedLimit = limit ?? 0;
      return [
        {
          id: 1000,
          content: "Deep archive note about the renewal workflow.",
          sourceType: "text",
          createdAt
        }
      ];
    },
    listMemoriesForSources: () => ({ 1000: [] })
  });

  assert.equal(requestedLimit, 1000);
  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, 1000);
});

test("recall can recover source matches beyond the first hundred captures", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");

  dbModule.createSourceItem("Needle note: Zenith renewal workflow belongs in the trusted memory layer.", "text");
  for (let index = 1; index <= 120; index += 1) {
    dbModule.createSourceItem(`Routine capture ${index}. Nothing about the target phrase.`, "text");
  }

  const results = await recall("Zenith renewal workflow");

  assert.equal(results.length, 1);
  assert.match(results[0].sourceSnippet, /Zenith renewal workflow/);
});

test("recall does not surface dismissed memories by default", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Need to follow up with Sarah about pricing after the demo.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Follow up with Sarah about pricing after the demo",
    confidence: 92,
    rationale: "The source says Ty needs to follow up with Sarah."
  });

  dbModule.updateMemoryStatus(memory.id, "dismissed");

  const results = await recall("What commitments mention Sarah?");

  assert.equal(results.length, 0);
});

test("recall can include non-active memory statuses when explicitly requested", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Need to send Sarah the pricing notes.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Send Sarah the pricing notes",
    confidence: 92,
    rationale: "The source says Ty needs to send Sarah notes."
  });

  dbModule.updateMemoryStatus(memory.id, "done");

  const defaultResults = await recall("Sarah pricing");
  const doneResults = await recall("Sarah pricing", 10, undefined, { statuses: ["done"] });

  assert.equal(defaultResults.length, 0);
  assert.equal(doneResults.length, 1);
  assert.equal(doneResults[0].memory?.status, "done");
});

test("recall can filter results to requested memory kinds", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem(
    "Met Sarah. Sarah project: tighten source-backed recall. Need to follow up with Sarah about pricing.",
    "text"
  );

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "person",
    content: "Sarah",
    confidence: 84,
    rationale: "The source says Ty met Sarah."
  });
  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "project",
    content: "Sarah: tighten source-backed recall",
    confidence: 86,
    rationale: "The source uses an explicit project label."
  });
  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Follow up with Sarah about pricing",
    confidence: 92,
    rationale: "The source says Ty needs to follow up with Sarah."
  });

  const results = await recall("Sarah", 10, undefined, { kinds: ["project"] });

  assert.equal(results.length, 1);
  assert.equal(results[0].memory?.kind, "project");
});
