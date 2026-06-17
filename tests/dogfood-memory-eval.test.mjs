import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateDogfoodRecall, seedDogfoodNotes } from "./dogfood-fixture.mjs";

async function importDogfoodWithTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-dogfood-eval-"));
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;

  const dbModule = await import(`../lib/db.ts?db=${cacheBuster}`);
  const extractionModule = await import(`../lib/extraction.ts?db=${cacheBuster}`);
  const recallModule = await import(`../lib/recall.ts?db=${cacheBuster}`);

  return { dbModule, extractionModule, recallModule };
}

test("dogfood recall answers V1 questions across 50 messy notes with source-backed results", async () => {
  const { dbModule, extractionModule, recallModule } = await importDogfoodWithTempDb();
  const seeded = await seedDogfoodNotes({ dbModule, extractionModule });
  const report = evaluateDogfoodRecall({ recall: recallModule.recall });

  assert.equal(seeded.sources.length, 50);
  assert.ok(seeded.memories.length > 0, "expected extracted proposed memories");
  assert.equal(report.misses.length, 0, JSON.stringify(report.misses, null, 2));
  assert.equal(report.falsePositives.length, 0, JSON.stringify(report.falsePositives, null, 2));
});
