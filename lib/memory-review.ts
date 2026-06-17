import type { MemoryStatus } from "./db.ts";

export type MemoryReviewState = {
  statusLabel: MemoryStatus;
  statusTone: "default" | "muted" | "review";
  nextAction: {
    label: "Dismiss" | "Restore" | "Confirm";
    status: MemoryStatus;
  };
};

export function getMemoryReviewState(status: MemoryStatus): MemoryReviewState {
  if (status === "active") {
    return {
      statusLabel: status,
      statusTone: "default",
      nextAction: { label: "Dismiss", status: "dismissed" }
    };
  }

  if (status === "needs_review") {
    return {
      statusLabel: status,
      statusTone: "review",
      nextAction: { label: "Confirm", status: "active" }
    };
  }

  return {
    statusLabel: status,
    statusTone: "muted",
    nextAction: { label: "Restore", status: "active" }
  };
}
