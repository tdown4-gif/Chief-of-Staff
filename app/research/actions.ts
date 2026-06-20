"use server";

import { createResearchQueueItem } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readOptionalPositiveInteger(formData: FormData, key: string): number | null {
  const rawValue = formData.get(key);
  if (rawValue == null || rawValue === "") {
    return null;
  }

  const value = typeof rawValue === "string" ? Number.parseInt(rawValue, 10) : NaN;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Research later requires a valid ${key}.`);
  }

  return value;
}

export async function markResearchLater(formData: FormData): Promise<void> {
  const returnTo = formData.get("returnTo");
  const redirectPath = returnTo === "/capture" || returnTo === "/inbox" ? returnTo : "/";

  await createResearchQueueItem({
    sourceItemId: readOptionalPositiveInteger(formData, "sourceItemId"),
    memoryId: readOptionalPositiveInteger(formData, "memoryId")
  });

  revalidatePath("/");
  revalidatePath(redirectPath);
  redirect(`${redirectPath}?researchQueued=1`);
}
