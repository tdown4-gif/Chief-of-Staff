"use server";

import { validateCaptureContent } from "@/lib/capture";
import { createSourceItem } from "@/lib/db";
import { extractAndStoreMemoriesForSource } from "@/lib/extraction";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveCapture(formData: FormData): Promise<void> {
  const content = formData.get("content");

  if (typeof content !== "string") {
    redirect("/capture?error=empty");
  }

  const validation = validateCaptureContent(content);

  if (!validation.ok) {
    redirect(`/capture?error=${validation.error}`);
  }

  const source = createSourceItem(content, "text");
  const { error } = await extractAndStoreMemoriesForSource(source);
  if (error) {
    console.error("extraction failed for source", source.id, error);
  }

  revalidatePath("/capture");
  revalidatePath("/inbox");
  redirect("/inbox?captured=1");
}
