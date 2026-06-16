import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("source items preserve raw content exactly while rejecting blank captures", async () => {
  const { createSourceItem } = await importWithTempDb("../lib/db.ts");
  const raw = "\n  Met Mike. Insurance agency owner.  \n";

  const item = createSourceItem(raw);

  assert.equal(item.content, raw);
  assert.throws(() => createSourceItem(" \n\t "), /Capture cannot be empty/);
});

test("long text captures are accepted by v0 validation", async () => {
  const { MAX_CAPTURE_CHARACTERS, validateCaptureContent } = await import("../lib/capture.ts");
  const longCapture = `Transcript dump:\n${"Long source text. ".repeat(1500)}`;

  assert.ok(MAX_CAPTURE_CHARACTERS >= 50000);
  assert.deepEqual(validateCaptureContent(longCapture), { ok: true });
  assert.deepEqual(validateCaptureContent(" \n\t "), { ok: false, error: "empty" });
  assert.deepEqual(validateCaptureContent("x".repeat(MAX_CAPTURE_CHARACTERS + 1)), { ok: false, error: "too-long" });
});
