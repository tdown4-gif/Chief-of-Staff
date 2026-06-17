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
  const dbModule = await importWithTempDb("../lib/db.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem("Met Mike. Insurance agency owner. Interested in AI workflows.", "text");

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "person",
    content: "Mike",
    confidence: 84,
    rationale: "The source says Ty met Mike."
  });

  const results = recall("Who was the insurance guy?");

  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, source.id);
  assert.equal(results[0].memory?.kind, "person");
  assert.equal(results[0].memory?.content, "Mike");
  assert.match(results[0].sourceSnippet, /Insurance agency owner/);
  assert.ok(results[0].score > 0);
});

test("recall searches raw captures even when no memory has been extracted", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const { recall } = await import("../lib/recall.ts");
  const source = dbModule.createSourceItem(
    "Palms AI idea: turn messy founder notes into structured venture briefs.",
    "text"
  );

  const results = recall("venture briefs");

  assert.equal(results.length, 1);
  assert.equal(results[0].source.id, source.id);
  assert.equal(results[0].memory, null);
  assert.match(results[0].sourceSnippet, /venture briefs/);
});
