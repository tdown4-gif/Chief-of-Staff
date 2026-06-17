import assert from "node:assert/strict";
import test from "node:test";

test("recall view state distinguishes idle, results, and no-result states", async () => {
  const { formatRecallResultsHeading, getRecallViewState } = await import("../lib/recall-view.ts");

  assert.equal(getRecallViewState("   ", 0), "idle");
  assert.equal(getRecallViewState("insurance", 0), "no-results");
  assert.equal(getRecallViewState("insurance", 2), "results");
  assert.equal(formatRecallResultsHeading(" insurance ", 1), '1 source-backed result for "insurance"');
  assert.equal(formatRecallResultsHeading(" insurance ", 3), '3 source-backed results for "insurance"');
});
