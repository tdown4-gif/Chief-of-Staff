import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-daily-use-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("capture success returns to capture so the PWA is ready for the next note", async () => {
  const { CAPTURE_SUCCESS_REDIRECT_PATH } = await import("../lib/capture.ts");

  assert.equal(CAPTURE_SUCCESS_REDIRECT_PATH, "/capture?captured=1");
});

test("daily-use dashboard queries the memory surfaces Ty needs to check", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const capture = dbModule.createSourceItem("Met Sarah. Need to send pricing after demo.", "text");
  const reviewSource = dbModule.createSourceItem("Maybe John from the thing is connected to Palms AI?", "text");

  dbModule.createMemory({
    sourceItemId: capture.id,
    kind: "commitment",
    content: "Send Sarah pricing after demo",
    confidence: 92,
    rationale: "The source says Ty needs to send pricing."
  });
  dbModule.createMemory({
    sourceItemId: reviewSource.id,
    kind: "person",
    content: "John",
    confidence: 45,
    rationale: "Weak extraction from incomplete context.",
    status: "needs_review"
  });

  const recentCaptures = dbModule.listRecentSourceItems(5);
  const openLoops = dbModule.listOpenCommitments(5);
  const needingReview = dbModule.listMemoriesNeedingReview(5);

  assert.equal(recentCaptures.length, 2);
  assert.equal(openLoops.length, 1);
  assert.equal(openLoops[0].memory.content, "Send Sarah pricing after demo");
  assert.equal(needingReview.length, 1);
  assert.equal(needingReview[0].memory.status, "needs_review");
  assert.equal(needingReview[0].source.id, reviewSource.id);
});
