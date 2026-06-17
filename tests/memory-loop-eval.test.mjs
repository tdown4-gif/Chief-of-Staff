import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  evaluateMemoryLoopFixture,
  memoryLoopCases,
  memoryLoopRecallQueries
} from "./memory-loop-fixture.mjs";

function countExpected(field) {
  return memoryLoopCases.reduce((total, item) => total + (item[field]?.length ?? 0), 0);
}

async function importLoopWithTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-memory-loop-eval-"));
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;

  const dbModule = await import(`../lib/db-local.ts?db=${cacheBuster}`);
  const extractionModule = await import(`../lib/extraction.ts?db=${cacheBuster}`);
  const recallModule = await import(`../lib/recall.ts?db=${cacheBuster}`);

  return { dbModule, extractionModule, recallModule };
}

test("seeded capture extraction recall and open-loops loop stays source-backed", async () => {
  const { dbModule, extractionModule, recallModule } = await importLoopWithTempDb();
  const sources = memoryLoopCases.map((item) => dbModule.createSourceItem(item.note, "text"));
  const results = await Promise.all(
    sources.map((source) => extractionModule.extractAndStoreMemoriesForSource(source))
  );
  const memories = results.flatMap((result) => result.memories);

  assert.deepEqual(
    results.map((result) => result.error),
    memoryLoopCases.map(() => null)
  );

  const loops = dbModule.listOpenCommitments();
  const summary = await evaluateMemoryLoopFixture({
    cases: memoryLoopCases,
    sources,
    memories,
    openLoops: loops,
    recall: recallModule.recall
  });
  const expectedKinds = countExpected("expectedKinds");
  const expectedMemories = countExpected("expectedMemories");
  const expectedDates = countExpected("expectedExplicitDates");
  const expectedOpenLoops = countExpected("expectedOpenLoops");

  assert.deepEqual(summary.kindCoverage, { matched: expectedKinds, total: expectedKinds }, summary.failures.join("\n"));
  assert.deepEqual(summary.memoryCoverage, { matched: expectedMemories, total: expectedMemories }, summary.failures.join("\n"));
  assert.deepEqual(summary.dateCoverage, { matched: expectedDates, total: expectedDates }, summary.failures.join("\n"));
  assert.deepEqual(summary.openLoopCoverage, { matched: expectedOpenLoops, total: expectedOpenLoops }, summary.failures.join("\n"));
  assert.deepEqual(summary.recallCoverage, { matched: memoryLoopRecallQueries.length, total: memoryLoopRecallQueries.length }, summary.failures.join("\n"));
  assert.equal(summary.unexpectedMemoryCount, 0, summary.failures.join("\n"));
  assert.equal(summary.unexpectedOpenLoopCount, 0, summary.failures.join("\n"));
});
