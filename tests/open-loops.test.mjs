import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-open-loops-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("open loops list active commitments with source proof and confidence", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const source = dbModule.createSourceItem(
    "Need to follow up with Sarah about pricing after the demo.",
    "text"
  );
  const ideaSource = dbModule.createSourceItem("Idea: better recall snippets.", "text");

  dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Follow up with Sarah about pricing after the demo",
    confidence: 92,
    rationale: "The source says Ty needs to follow up with Sarah."
  });
  dbModule.createMemory({
    sourceItemId: ideaSource.id,
    kind: "idea",
    content: "better recall snippets",
    confidence: 88,
    rationale: "The source uses an explicit idea label."
  });

  const loops = dbModule.listOpenCommitments();

  assert.equal(loops.length, 1);
  assert.equal(loops[0].memory.kind, "commitment");
  assert.equal(loops[0].memory.status, "active");
  assert.equal(loops[0].memory.confidence, 92);
  assert.equal(loops[0].source.id, source.id);
  assert.match(loops[0].source.content, /Need to follow up with Sarah/);
});

test("done and dismissed commitments are removed from open loops", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const doneSource = dbModule.createSourceItem("Need to send Sarah the pricing notes.", "text");
  const dismissedSource = dbModule.createSourceItem("Need to revisit an old maybe someday idea.", "text");

  const doneMemory = dbModule.createMemory({
    sourceItemId: doneSource.id,
    kind: "commitment",
    content: "Send Sarah the pricing notes",
    confidence: 92,
    rationale: "The source says Ty needs to send Sarah notes."
  });
  const dismissedMemory = dbModule.createMemory({
    sourceItemId: dismissedSource.id,
    kind: "commitment",
    content: "Revisit an old maybe someday idea",
    confidence: 80,
    rationale: "The source says Ty needs to revisit an idea."
  });

  dbModule.updateMemoryStatus(doneMemory.id, "done");
  dbModule.updateMemoryStatus(dismissedMemory.id, "dismissed");

  assert.deepEqual(dbModule.listOpenCommitments(), []);
});
