import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-useful-today-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("useful today can list recent active ideas and people with source proof", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const ideaSource = dbModule.createSourceItem("Idea: use memory captures to spot repeated Palms AI workflows.", "note");
  const personSource = dbModule.createSourceItem("Met Sarah from Lumen. She cares about insurance AI.", "text");
  const dismissedSource = dbModule.createSourceItem("Idea: old dismissed thought.", "text");

  const idea = dbModule.createMemory({
    sourceItemId: ideaSource.id,
    kind: "idea",
    content: "Use memory captures to spot repeated Palms AI workflows",
    confidence: 91,
    rationale: "The source starts with an explicit idea label."
  });
  const person = dbModule.createMemory({
    sourceItemId: personSource.id,
    kind: "person",
    content: "Sarah from Lumen",
    confidence: 87,
    rationale: "The source says Ty met Sarah from Lumen."
  });
  dbModule.createMemory({
    sourceItemId: dismissedSource.id,
    kind: "idea",
    content: "old dismissed thought",
    confidence: 72,
    rationale: "The source starts with an explicit idea label.",
    status: "dismissed"
  });

  const ideas = dbModule.listRecentMemoriesByKind("idea", 10);
  const people = dbModule.listRecentMemoriesByKind("person", 10);

  assert.equal(ideas.length, 1);
  assert.equal(ideas[0].memory.id, idea.id);
  assert.equal(ideas[0].source.id, ideaSource.id);
  assert.equal(people.length, 1);
  assert.equal(people[0].memory.id, person.id);
  assert.equal(people[0].source.id, personSource.id);
});
