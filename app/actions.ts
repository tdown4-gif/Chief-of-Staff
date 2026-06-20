"use server";

import { CAPTURE_SUCCESS_REDIRECT_PATH, normalizeCaptureSourceType, validateCaptureContent } from "@/lib/capture";
import { createSourceItem, createYouTubeSource } from "@/lib/db";
import { extractAndStoreMemoriesForSource } from "@/lib/extraction";
import { buildYouTubeSourceInput, extractYouTubeReference } from "@/lib/youtube";
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

  const sourceType = extractYouTubeReference(content) ? "youtube" : normalizeCaptureSourceType(formData.get("sourceType"));
  const source = await createSourceItem(content, sourceType);
  const youtubeContext = formData.get("youtubeContext");
  const youtubeSourceInput = await buildYouTubeSourceInput(
    source.id,
    content,
    fetch,
    typeof youtubeContext === "string" ? youtubeContext : null
  );
  if (youtubeSourceInput) {
    await createYouTubeSource(youtubeSourceInput);
  }
  const { error } = await extractAndStoreMemoriesForSource(source);
  if (error) {
    console.error("extraction failed for source", source.id, error);
  }

  revalidatePath("/capture");
  revalidatePath("/inbox");
  revalidatePath("/");
  redirect(CAPTURE_SUCCESS_REDIRECT_PATH);
}
