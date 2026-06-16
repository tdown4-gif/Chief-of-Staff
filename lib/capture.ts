export const MAX_CAPTURE_CHARACTERS = 100000;

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
