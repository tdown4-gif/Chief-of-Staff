"use server";

import { validateCaptureContent } from "@/lib/capture";
import { createSourceItem } from "@/lib/db";
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

  createSourceItem(content, "text");
  revalidatePath("/capture");
  revalidatePath("/inbox");
  redirect("/inbox?captured=1");
}
