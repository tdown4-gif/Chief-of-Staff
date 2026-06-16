import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importDbWithTempPath() {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-memory-test-"));
  const dbPath = path.join(dir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;
  const dbModule = await import(`../lib/db.ts?db=${Date.now()}-${Math.random()}`);
  return { dbPath, dbModule };
}

test("memory schema supports source-backed v0 memory kinds", async () => {
  const { dbPath, dbModule } = await importDbWithTempPath();
  const source = dbModule.createSourceItem("Met Mike. Insurance agency owner.", "text");

  for (const kind of ["person", "project", "idea", "commitment"]) {
    const memory = dbModule.createMemory({
      sourceItemId: source.id,
      kind,
      content: `Extracted ${kind}`,
      confidence: 82,
      rationale: "Directly stated in source"
    });

    assert.equal(memory.sourceItemId, source.id);
    assert.equal(memory.kind, kind);
    assert.equal(memory.confidence, 82);
  }

  const database = new Database(dbPath);
  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);

  assert.ok(tables.includes("source_items"));
  assert.ok(tables.includes("memories"));

  const rows = database
    .prepare("SELECT source_item_id, kind, content, confidence, rationale FROM memories ORDER BY id")
    .all();

  assert.deepEqual(rows.map((row) => row.kind), ["person", "project", "idea", "commitment"]);
  assert.ok(rows.every((row) => row.source_item_id === source.id));
});

test("memories can be listed by source for provenance", async () => {
  const { dbModule } = await importDbWithTempPath();
  const source = dbModule.createSourceItem("Need to follow up with Sarah about pricing.", "text");

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Follow up with Sarah about pricing",
    confidence: 95,
    rationale: "The source says this is needed."
  });

  const memories = dbModule.listMemoriesForSource(source.id);

  assert.equal(memories.length, 1);
  assert.equal(memories[0].sourceItemId, source.id);
  assert.equal(memories[0].kind, "commitment");
});
