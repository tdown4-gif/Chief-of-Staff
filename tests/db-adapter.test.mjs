import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-db-adapter-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

async function importWithTempLibsqlDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-libsql-adapter-test-"));
  delete process.env.DATABASE_URL;
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.TURSO_AUTH_TOKEN = "test-token";
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("public db facade uses local sqlite adapter by default", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");

  assert.equal(dbModule.getDatabaseAdapterKind(), "local-sqlite");
});

test("public db facade uses libsql persistence when Turso environment is configured", async () => {
  const dbModule = await importWithTempLibsqlDb("../lib/db.ts");

  assert.equal(dbModule.getDatabaseAdapterKind(), "libsql");

  const source = await dbModule.createSourceItem("Captured on iPhone, visible on laptop.", "text");
  const memory = await dbModule.createMemory({
    sourceItemId: source.id,
    kind: "idea",
    content: "Shared capture should persist through libSQL",
    confidence: 93,
    rationale: "The source describes a capture that should be visible across devices."
  });

  assert.equal((await dbModule.listRecentSourceItems(1))[0].content, "Captured on iPhone, visible on laptop.");
  assert.equal((await dbModule.listMemoriesForSource(source.id))[0].id, memory.id);
});

test("public db facade preserves capture and memory behavior through adapter", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const source = await dbModule.createSourceItem("Met Sarah. Need to send pricing.", "text");
  const memory = await dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Send Sarah pricing",
    confidence: 92,
    rationale: "The source says Ty needs to send pricing."
  });

  assert.equal((await dbModule.listRecentSourceItems(1))[0].content, "Met Sarah. Need to send pricing.");
  assert.equal((await dbModule.listMemoriesForSource(source.id))[0].id, memory.id);
  assert.equal((await dbModule.listOpenCommitments())[0].memory.content, "Send Sarah pricing");
});
