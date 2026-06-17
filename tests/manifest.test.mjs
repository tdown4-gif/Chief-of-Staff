import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("web manifest is configured for quick capture install", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

  assert.equal(manifest.start_url, "/capture");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.src === "/icon.svg" && icon.sizes === "any"));
});
