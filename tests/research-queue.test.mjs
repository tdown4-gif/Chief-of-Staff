import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-research-queue-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("research queue stores explicit research intent linked to source and memory", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const source = dbModule.createSourceItem("Idea: research competitors for AI insurance workflow tooling.", "note");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "idea",
    content: "Research competitors for AI insurance workflow tooling",
    confidence: 92,
    rationale: "The source starts with an explicit idea label."
  });

  const item = dbModule.createResearchQueueItem({
    sourceItemId: source.id,
    memoryId: memory.id
  });

  assert.equal(item.sourceItemId, source.id);
  assert.equal(item.memoryId, memory.id);
  assert.equal(item.status, "queued");
  assert.match(item.createdAt, /^\d{4}-\d{2}-\d{2}T/);

  const queued = dbModule.listResearchQueueItems(10);

  assert.equal(queued.length, 1);
  assert.equal(queued[0].researchQueueItem.id, item.id);
  assert.equal(queued[0].memory?.id, memory.id);
  assert.equal(queued[0].source.id, source.id);
});

test("research queue requires at least one source or memory link", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");

  assert.throws(
    () => dbModule.createResearchQueueItem({}),
    /Research queue item requires a source item or memory/
  );
});
