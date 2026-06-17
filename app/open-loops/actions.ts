"use server";

import { updateCommitmentStatus, type MemoryStatus } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readMemoryId(formData: FormData): number {
  const rawMemoryId = formData.get("memoryId");
  const memoryId = typeof rawMemoryId === "string" ? Number.parseInt(rawMemoryId, 10) : NaN;

  if (!Number.isInteger(memoryId) || memoryId < 1) {
    throw new Error("Open loop action requires a valid memory id.");
  }

  return memoryId;
}

async function updateOpenLoop(formData: FormData, status: MemoryStatus): Promise<void> {
  updateCommitmentStatus(readMemoryId(formData), status);
  revalidatePath("/open-loops");
  redirect("/open-loops");
}

export async function markOpenLoopDone(formData: FormData): Promise<void> {
  await updateOpenLoop(formData, "done");
}

export async function dismissOpenLoop(formData: FormData): Promise<void> {
  await updateOpenLoop(formData, "dismissed");
}
