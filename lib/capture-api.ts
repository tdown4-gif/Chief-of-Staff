import { validateCaptureContent } from "./capture.ts";
import { createSourceItem, createYouTubeSource, type SourceItem } from "./db.ts";
import { extractAndStoreMemoriesForSource } from "./extraction.ts";
import { buildYouTubeSourceInput, extractYouTubeReference } from "./youtube.ts";

export type ScheduleAfterResponse = (task: () => Promise<void> | void) => void;

type CapturePayload = {
  text: string;
  youtubeContext: string | null;
};

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

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

async function readCapturePayload(request: Request): Promise<CapturePayload | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      text?: unknown;
      content?: unknown;
      youtubeContext?: unknown;
      whySavedThis?: unknown;
      context?: unknown;
    } | null;
    const text = typeof body?.text === "string"
      ? body.text
      : typeof body?.content === "string"
        ? body.content
        : null;
    if (text != null) {
      return {
        text,
        youtubeContext:
          readOptionalString(body?.youtubeContext) ??
          readOptionalString(body?.whySavedThis) ??
          readOptionalString(body?.context)
      };
    }
    return null;
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const text = formData?.get("text") ?? formData?.get("content");
    if (typeof text !== "string" || !text.trim()) {
      return null;
    }
    const youtubeContext =
      formData?.get("youtubeContext") ??
      formData?.get("whySavedThis") ??
      formData?.get("context");
    return {
      text,
      youtubeContext: typeof youtubeContext === "string" && youtubeContext.trim() ? youtubeContext : null
    };
  }

  if (contentType.includes("text/plain")) {
    return { text: await request.text(), youtubeContext: null };
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

  const payload = await readCapturePayload(request);
  if (!payload) {
    return Response.json({ ok: false, error: "invalid_capture" }, { status: 400 });
  }

  const { text } = payload;
  const validation = validateCaptureContent(text);
  if (!validation.ok) {
    return Response.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const source = await createSourceItem(text, extractYouTubeReference(text) ? "youtube" : "text");
  const youtubeSourceInput = await buildYouTubeSourceInput(source.id, text, fetch, payload.youtubeContext);
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
