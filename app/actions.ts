"use server";

import { createSourceItem } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveCapture(formData: FormData): Promise<void> {
  const content = formData.get("content");

  if (typeof content !== "string" || content.trim().length === 0) {
    redirect("/capture?error=empty");
  }

  if (content.length > 10000) {
    redirect("/capture?error=too-long");
  }

  createSourceItem(content, "text");
  revalidatePath("/capture");
  revalidatePath("/inbox");
  redirect("/inbox?captured=1");
}
