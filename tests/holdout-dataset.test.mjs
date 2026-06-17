import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateHoldoutRecall, holdoutNotes, seedHoldoutDataset } from "./holdout-dataset.mjs";

async function importHoldoutWithTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-holdout-"));
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  process.env.DATABASE_URL = `file:${path.join(dir, "holdout.db")}`;

  const dbModule = await import(`../lib/db-local.ts?holdout=${cacheBuster}`);
  const extractionModule = await import(`../lib/extraction.ts?holdout=${cacheBuster}`);
  const recallModule = await import(`../lib/recall.ts?holdout=${cacheBuster}`);

  return { dbModule, extractionModule, recallModule };
}

test("holdout dataset keeps fresh recall validation source-backed", async () => {
  const { dbModule, extractionModule, recallModule } = await importHoldoutWithTempDb();
  const seeded = await seedHoldoutDataset({ dbModule, extractionModule });
  const report = await evaluateHoldoutRecall({ recall: recallModule.recall });

  assert.equal(holdoutNotes.length, 20);
  assert.equal(seeded.sources.length, 20);
  assert.equal(report.queryCount, 5);
  assert.equal(report.sourceBackedQueryCount, 5);
});
