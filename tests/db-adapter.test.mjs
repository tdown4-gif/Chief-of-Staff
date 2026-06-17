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

test("public db facade uses local sqlite adapter by default", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");

  assert.equal(dbModule.getDatabaseAdapterKind(), "local-sqlite");
});

test("public db facade preserves capture and memory behavior through adapter", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const source = dbModule.createSourceItem("Met Sarah. Need to send pricing.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Send Sarah pricing",
    confidence: 92,
    rationale: "The source says Ty needs to send pricing."
  });

  assert.equal(dbModule.listRecentSourceItems(1)[0].content, "Met Sarah. Need to send pricing.");
  assert.equal(dbModule.listMemoriesForSource(source.id)[0].id, memory.id);
  assert.equal(dbModule.listOpenCommitments()[0].memory.content, "Send Sarah pricing");
});
