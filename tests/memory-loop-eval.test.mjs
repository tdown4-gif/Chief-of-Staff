import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importLoopWithTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-memory-loop-eval-"));
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;

  const dbModule = await import(`../lib/db.ts?db=${cacheBuster}`);
  const extractionModule = await import(`../lib/extraction.ts?db=${cacheBuster}`);
  const recallModule = await import(`../lib/recall.ts?db=${cacheBuster}`);

  return { dbModule, extractionModule, recallModule };
}

test("seeded capture extraction recall and open-loops loop stays source-backed", async () => {
  const { dbModule, extractionModule, recallModule } = await importLoopWithTempDb();
  const seedNotes = [
    "Met Mike after the demo. Insurance agency owner. He keeps losing renewal follow-through in scattered notes.",
    "Idea: AI tool for insurance agencies that remembers renewal dates and suggests outreach.",
    "Palms AI project: turn messy founder notes into structured venture briefs.",
    "Need to follow up with Sarah about pricing after the demo on July 12, 2026.",
    "Archived receipts, cleaned the desktop, and watched a movie."
  ];

  const sources = seedNotes.map((note) => dbModule.createSourceItem(note, "text"));
  const results = await Promise.all(
    sources.map((source) => extractionModule.extractAndStoreMemoriesForSource(source))
  );
  const memories = results.flatMap((result) => result.memories);

  assert.deepEqual(
    results.map((result) => result.error),
    [null, null, null, null, null]
  );
  assert.ok(memories.some((memory) => memory.kind === "person" && memory.content.includes("Mike")));
  assert.ok(memories.some((memory) => memory.kind === "idea" && memory.content.includes("insurance agencies")));
  assert.ok(memories.some((memory) => memory.kind === "project" && memory.content.includes("Palms AI")));
  assert.ok(memories.some((memory) => memory.kind === "commitment" && memory.content.includes("Sarah")));

  const insuranceResults = recallModule.recall("What was the AI idea for insurance agencies?");
  const insuranceAnswer = insuranceResults.find((result) => result.memory?.kind === "idea");

  assert.ok(insuranceAnswer, "expected recall to return the insurance idea memory");
  assert.match(insuranceAnswer.memory.content, /insurance agencies/);
  assert.match(insuranceAnswer.source.content, /remembers renewal dates/);
  assert.match(insuranceAnswer.sourceSnippet, /insurance agencies/);

  const loops = dbModule.listOpenCommitments();
  const sarahLoop = loops.find((loop) => loop.memory.content.includes("Sarah"));

  assert.equal(loops.length, 1);
  assert.ok(sarahLoop, "expected open loops to include the Sarah pricing commitment");
  assert.equal(sarahLoop.memory.kind, "commitment");
  assert.match(sarahLoop.source.content, /July 12, 2026/);
  assert.ok(!loops.some((loop) => loop.source.id === sources[4].id), "benign note should not create an open loop");
});
