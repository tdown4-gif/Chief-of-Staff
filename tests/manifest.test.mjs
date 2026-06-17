import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("web manifest is configured for quick capture install", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

  assert.equal(manifest.start_url, "/capture");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.src === "/icon.svg" && icon.sizes === "any" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.src === "/icon-192.png" && icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.src === "/icon-512.png" && icon.sizes === "512x512"));
});

test("home-screen icons include raster assets for iPhone and install surfaces", () => {
  assert.ok(existsSync("public/apple-touch-icon.png"));
  assert.ok(existsSync("public/icon-192.png"));
  assert.ok(existsSync("public/icon-512.png"));
});
