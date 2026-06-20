import { validateCaptureContent } from "./capture.ts";
import { createSourceItem, createYouTubeSource, type SourceItem } from "./db.ts";
import { extractAndStoreMemoriesForSource } from "./extraction.ts";
import { buildYouTubeSourceInput, extractYouTubeReference } from "./youtube.ts";

export type ScheduleAfterResponse = (task: () => Promise<void> | void) => void;

function unauthorized() {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function getCaptureApiToken() {
  return process.env.CAPTURE_API_TOKEN?.trim() ?? "";
}

function isAuthorized(request: Request) {
  const token = getCaptureApiToken();
  if (!token) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${token}`;
}

async function readCaptureText(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { text?: unknown; content?: unknown } | null;
    if (typeof body?.text === "string") {
      return body.text;
    }
    if (typeof body?.content === "string") {
      return body.content;
    }
    return null;
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const text = formData?.get("text") ?? formData?.get("content");
    return typeof text === "string" ? text : null;
  }

  if (contentType.includes("text/plain")) {
    return request.text();
  }

  return null;
}

function scheduleExtraction(source: SourceItem, scheduleAfterResponse: ScheduleAfterResponse) {
  scheduleAfterResponse(async () => {
    const { error } = await extractAndStoreMemoriesForSource(source);
    if (error) {
      console.error("extraction failed for source", source.id, error);
    }
  });
}

export async function handleCaptureApiRequest(request: Request, scheduleAfterResponse: ScheduleAfterResponse) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const text = await readCaptureText(request);
  if (typeof text !== "string") {
    return Response.json({ ok: false, error: "invalid_capture" }, { status: 400 });
  }

  const validation = validateCaptureContent(text);
  if (!validation.ok) {
    return Response.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const source = await createSourceItem(text, extractYouTubeReference(text) ? "youtube" : "text");
  const youtubeSourceInput = await buildYouTubeSourceInput(source.id, text);
  if (youtubeSourceInput) {
    await createYouTubeSource(youtubeSourceInput);
  }
  scheduleExtraction(source, scheduleAfterResponse);

  return Response.json(
    {
      ok: true,
      status: "saved",
      message: "Saved",
      sourceId: source.id,
      createdAt: source.createdAt
    },
    { status: 201 }
  );
}
