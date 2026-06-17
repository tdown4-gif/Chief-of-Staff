import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateTyChaosRecall, seedTyChaosDataset, tyChaosNotes } from "./ty-chaos-dataset.mjs";

async function importChaosWithTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-ty-chaos-"));
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  process.env.DATABASE_URL = `file:${path.join(dir, "chaos.db")}`;

  const dbModule = await import(`../lib/db.ts?chaos=${cacheBuster}`);
  const extractionModule = await import(`../lib/extraction.ts?chaos=${cacheBuster}`);
  const recallModule = await import(`../lib/recall.ts?chaos=${cacheBuster}`);

  return { dbModule, extractionModule, recallModule };
}

test("Ty Chaos Dataset seeds 100 messy notes and reports retrieval failure categories", async () => {
  const { dbModule, extractionModule, recallModule } = await importChaosWithTempDb();
  const seeded = await seedTyChaosDataset({ dbModule, extractionModule });
  const report = evaluateTyChaosRecall({ recall: recallModule.recall, memories: seeded.memories });

  assert.equal(tyChaosNotes.length, 100);
  assert.equal(seeded.sources.length, 100);
  assert.ok(report.misses.length > 0, "chaos dataset should reveal recall misses");
  assert.ok(report.falsePositives.length > 0, "chaos dataset should reveal false positives");
  assert.ok(report.ambiguousRetrievals.length > 0, "chaos dataset should reveal ambiguous retrievals");
  assert.ok(report.missingContext.length > 0, "chaos dataset should reveal missing context");
  assert.ok(report.weakConfidenceScores.length > 0, "chaos dataset should reveal weak confidence scores");
});
