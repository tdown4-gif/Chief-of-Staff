"use server";

import { createRecallFeedback, type RecallFeedbackAction } from "../../lib/db.ts";

const allowedFeedbackActions = new Set<RecallFeedbackAction>(["not_relevant", "promote_to_memory", "add_context"]);

function readPositiveInt(formData: Pick<FormData, "get">, key: string): number {
  const rawValue = formData.get(key);
  const value = typeof rawValue === "string" ? Number.parseInt(rawValue, 10) : NaN;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Recall feedback requires a valid ${key}.`);
  }

  return value;
}

export async function saveRecallFeedback(formData: Pick<FormData, "get">): Promise<void> {
  const rawQuery = formData.get("query");
  const rawAction = formData.get("action");
  const rawMemoryId = formData.get("memoryId");
  const rawNote = formData.get("note");

  if (typeof rawQuery !== "string" || !rawQuery.trim()) {
    throw new Error("Recall feedback requires a query.");
  }

  if (typeof rawAction !== "string" || !allowedFeedbackActions.has(rawAction as RecallFeedbackAction)) {
    throw new Error("Recall feedback requires a valid feedback action.");
  }

  await createRecallFeedback({
    query: rawQuery,
    action: rawAction as RecallFeedbackAction,
    sourceItemId: readPositiveInt(formData, "sourceItemId"),
    memoryId: typeof rawMemoryId === "string" && rawMemoryId ? Number.parseInt(rawMemoryId, 10) : null,
    note: typeof rawNote === "string" ? rawNote : null
  });
}
