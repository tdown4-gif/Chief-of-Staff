export const MAX_CAPTURE_CHARACTERS = 100000;
export const CAPTURE_SUCCESS_REDIRECT_PATH = "/capture?captured=1";
export const SOURCE_TYPES = ["text", "note", "link", "document", "contact", "youtube"] as const;

export type CaptureSourceType = (typeof SOURCE_TYPES)[number];

export type CaptureValidationResult =
  | { ok: true }
  | { ok: false; error: "empty" | "too-long" };

export function validateCaptureContent(content: string): CaptureValidationResult {
  if (content.trim().length === 0) {
    return { ok: false, error: "empty" };
  }

  if (content.length > MAX_CAPTURE_CHARACTERS) {
    return { ok: false, error: "too-long" };
  }

  return { ok: true };
}

export function normalizeCaptureSourceType(value: FormDataEntryValue | null): CaptureSourceType {
  return typeof value === "string" && SOURCE_TYPES.includes(value as CaptureSourceType)
    ? (value as CaptureSourceType)
    : "text";
}
