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

test("memories can be listed for multiple sources in one query", async () => {
  const { dbModule } = await importDbWithTempPath();
  const firstSource = dbModule.createSourceItem("Met Mike.", "text");
  const secondSource = dbModule.createSourceItem("Idea: renewal reminder.", "text");

  dbModule.createMemory({
    sourceItemId: firstSource.id,
    kind: "person",
    content: "Mike",
    confidence: 84,
    rationale: "The source says Ty met Mike."
  });
  dbModule.createMemory({
    sourceItemId: secondSource.id,
    kind: "idea",
    content: "renewal reminder",
    confidence: 88,
    rationale: "The source uses an explicit idea label."
  });

  const memoriesBySource = dbModule.listMemoriesForSources([firstSource.id, secondSource.id]);

  assert.equal(memoriesBySource[firstSource.id].length, 1);
  assert.equal(memoriesBySource[firstSource.id][0].content, "Mike");
  assert.equal(memoriesBySource[secondSource.id].length, 1);
  assert.equal(memoriesBySource[secondSource.id][0].kind, "idea");
});

test("memory creation rejects empty rationale", async () => {
  const { dbModule } = await importDbWithTempPath();
  const source = dbModule.createSourceItem("Met Mike.", "text");

  assert.throws(
    () =>
      dbModule.createMemory({
        sourceItemId: source.id,
        kind: "person",
        content: "Mike",
        confidence: 84,
        rationale: "   "
      }),
    /Memory rationale cannot be empty/
  );

  assert.equal(dbModule.listMemoriesForSource(source.id).length, 0);
});

test("memory content can be corrected without losing provenance", async () => {
  const { dbModule } = await importDbWithTempPath();
  const source = dbModule.createSourceItem("Met Mike. Insurance agency owner.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "person",
    content: "Mike Insurance",
    confidence: 84,
    rationale: "The source says Ty met Mike."
  });

  const updated = dbModule.updateMemoryContent(memory.id, "  Mike  ");

  assert.equal(updated.id, memory.id);
  assert.equal(updated.sourceItemId, source.id);
  assert.equal(updated.kind, "person");
  assert.equal(updated.content, "Mike");
  assert.equal(updated.confidence, 84);
  assert.equal(updated.rationale, "The source says Ty met Mike.");
  assert.equal(updated.status, "active");
  assert.equal(dbModule.listMemoriesForSource(source.id)[0].content, "Mike");
});

test("memory content correction rejects blank content and missing memories", async () => {
  const { dbModule } = await importDbWithTempPath();
  const source = dbModule.createSourceItem("Idea: renewal reminder.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "idea",
    content: "renewal reminder",
    confidence: 88,
    rationale: "The source uses an explicit idea label."
  });

  assert.throws(() => dbModule.updateMemoryContent(memory.id, "   "), /Memory content cannot be empty/);
  assert.throws(() => dbModule.updateMemoryContent(9999, "new content"), /Memory not found/);
  assert.equal(dbModule.listMemoriesForSource(source.id)[0].content, "renewal reminder");
});

test("proposed memories can be deleted without deleting the raw source", async () => {
  const { dbModule } = await importDbWithTempPath();
  const source = dbModule.createSourceItem("Met Mike. Insurance agency owner.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "person",
    content: "Mike",
    confidence: 84,
    rationale: "The source says Ty met Mike."
  });

  assert.equal(dbModule.deleteMemory(memory.id), true);
  assert.equal(dbModule.deleteMemory(memory.id), false);
  assert.deepEqual(dbModule.listMemoriesForSource(source.id), []);
  assert.equal(dbModule.listRecentSourceItems(1)[0].content, "Met Mike. Insurance agency owner.");
});

test("memory deletion rejects invalid ids", async () => {
  const { dbModule } = await importDbWithTempPath();

  assert.throws(() => dbModule.deleteMemory(0), /Memory requires a valid id/);
  assert.throws(() => dbModule.deleteMemory(Number.NaN), /Memory requires a valid id/);
});

test("multi-memory creation is atomic when a later draft is invalid", async () => {
  const { dbModule } = await importDbWithTempPath();
  const source = dbModule.createSourceItem("Met Mike. Idea: renewal reminder.", "text");

  assert.throws(
    () =>
      dbModule.createMemories([
        {
          sourceItemId: source.id,
          kind: "person",
          content: "Mike",
          confidence: 84,
          rationale: "The source says Ty met Mike."
        },
        {
          sourceItemId: source.id,
          kind: "idea",
          content: "renewal reminder",
          confidence: 88,
          rationale: " "
        }
      ]),
    /Memory rationale cannot be empty/
  );

  assert.equal(dbModule.listMemoriesForSource(source.id).length, 0);
});

test("memory status migration backfills existing rows as active", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-memory-migration-test-"));
  const dbPath = path.join(dir, "test.db");
  const database = new Database(dbPath);
  database.exec(`
    CREATE TABLE source_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_item_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('person', 'project', 'idea', 'commitment')),
      content TEXT NOT NULL,
      confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
      rationale TEXT NOT NULL DEFAULT '',
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_item_id) REFERENCES source_items(id) ON DELETE CASCADE
    );
  `);
  const createdAt = "2026-06-16T12:00:00.000Z";
  database
    .prepare("INSERT INTO source_items (content, source_type, created_at) VALUES (?, ?, ?)")
    .run("Need to follow up with Sarah about pricing.", "text", createdAt);
  database
    .prepare(`
      INSERT INTO memories (source_item_id, kind, content, confidence, rationale, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(1, "commitment", "Follow up with Sarah about pricing", 92, "The source says this is needed.", null, createdAt);
  database.close();

  process.env.DATABASE_URL = `file:${dbPath}`;
  const dbModule = await import(`../lib/db.ts?db=${Date.now()}-${Math.random()}`);
  const loops = dbModule.listOpenCommitments();
  const columns = new Database(dbPath).prepare("PRAGMA table_info(memories)").all().map((row) => row.name);

  assert.ok(columns.includes("status"));
  assert.equal(loops.length, 1);
  assert.equal(loops[0].memory.status, "active");
  assert.equal(loops[0].memory.content, "Follow up with Sarah about pricing");
});
