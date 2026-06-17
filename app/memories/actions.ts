"use server";

import { deleteMemory, updateMemoryContent, updateMemoryStatus, type MemoryStatus } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const allowedStatuses = new Set<MemoryStatus>(["active", "done", "dismissed"]);
const allowedReturnPaths = new Set(["/inbox", "/capture", "/recall", "/open-loops"]);

function readMemoryId(formData: FormData): number {
  const rawMemoryId = formData.get("memoryId");
  const memoryId = typeof rawMemoryId === "string" ? Number.parseInt(rawMemoryId, 10) : NaN;

  if (!Number.isInteger(memoryId) || memoryId < 1) {
    throw new Error("Memory review requires a valid memory id.");
  }

  return memoryId;
}

function readStatus(formData: FormData): MemoryStatus {
  const rawStatus = formData.get("status");

  if (typeof rawStatus !== "string" || !allowedStatuses.has(rawStatus as MemoryStatus)) {
    throw new Error("Memory review requires a valid status.");
  }

  return rawStatus as MemoryStatus;
}

function readReturnTo(formData: FormData): string {
  const rawReturnTo = formData.get("returnTo");

  return typeof rawReturnTo === "string" && allowedReturnPaths.has(rawReturnTo) ? rawReturnTo : "/inbox";
}

function revalidateMemoryViews() {
  revalidatePath("/capture");
  revalidatePath("/inbox");
  revalidatePath("/recall");
  revalidatePath("/open-loops");
}

export async function updateReviewedMemory(formData: FormData): Promise<void> {
  const returnTo = readReturnTo(formData);
  updateMemoryStatus(readMemoryId(formData), readStatus(formData));

  revalidateMemoryViews();
  redirect(`${returnTo}?memoryUpdated=1`);
}

export async function correctMemoryContent(formData: FormData): Promise<void> {
  const returnTo = readReturnTo(formData);
  const rawContent = formData.get("content");

  if (typeof rawContent !== "string") {
    throw new Error("Memory correction requires content.");
  }

  updateMemoryContent(readMemoryId(formData), rawContent);

  revalidateMemoryViews();
  redirect(`${returnTo}?memoryUpdated=1`);
}

export async function deleteReviewedMemory(formData: FormData): Promise<void> {
  const returnTo = readReturnTo(formData);
  deleteMemory(readMemoryId(formData));

  revalidateMemoryViews();
  redirect(`${returnTo}?memoryUpdated=1`);
}
