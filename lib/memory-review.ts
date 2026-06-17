import type { MemoryStatus } from "./db.ts";

export type MemoryReviewState = {
  statusLabel: MemoryStatus;
  statusTone: "default" | "muted";
  nextAction: {
    label: "Dismiss" | "Restore";
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

  return {
    statusLabel: status,
    statusTone: "muted",
    nextAction: { label: "Restore", status: "active" }
  };
}
