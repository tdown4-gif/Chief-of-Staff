import assert from "node:assert/strict";
import test from "node:test";

test("memory review presenter exposes status labels and safe next actions", async () => {
  const { getMemoryReviewState } = await import("../lib/memory-review.ts");

  assert.deepEqual(getMemoryReviewState("active"), {
    statusLabel: "active",
    statusTone: "default",
    nextAction: { label: "Dismiss", status: "dismissed" }
  });

  assert.deepEqual(getMemoryReviewState("dismissed"), {
    statusLabel: "dismissed",
    statusTone: "muted",
    nextAction: { label: "Restore", status: "active" }
  });

  assert.deepEqual(getMemoryReviewState("done"), {
    statusLabel: "done",
    statusTone: "muted",
    nextAction: { label: "Restore", status: "active" }
  });

  assert.deepEqual(getMemoryReviewState("needs_review"), {
    statusLabel: "needs_review",
    statusTone: "review",
    nextAction: { label: "Confirm", status: "active" }
  });
});
