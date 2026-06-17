import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-capture-api-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  process.env.CAPTURE_API_TOKEN = "test-capture-token";
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

function request(body, token = "test-capture-token") {
  return new Request("http://localhost/api/capture", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

test("shortcut capture API fails closed without configured token", async () => {
  const { handleCaptureApiRequest } = await importWithTempDb("../lib/capture-api.ts");
  delete process.env.CAPTURE_API_TOKEN;

  const response = await handleCaptureApiRequest(request({ text: "Should not save." }), () => {});
  const json = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(json, { ok: false, error: "unauthorized" });
});

test("shortcut capture API returns generic unauthorized for invalid token", async () => {
  const { handleCaptureApiRequest } = await importWithTempDb("../lib/capture-api.ts");

  const response = await handleCaptureApiRequest(request({ text: "Should not save." }, "wrong-token"), () => {});
  const json = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(json, { ok: false, error: "unauthorized" });
});

test("shortcut capture API saves raw source and schedules extraction after response", async () => {
  const route = await importWithTempDb("../lib/capture-api.ts");
  const dbModule = await import(`../lib/db.ts?db=${Date.now()}-${Math.random()}`);
  const scheduled = [];

  const response = await route.handleCaptureApiRequest(
    request({ text: "Need to follow up with Sarah about pricing after the demo." }),
    (task) => scheduled.push(task)
  );
  const json = await response.json();

  assert.equal(response.status, 201);
  assert.equal(json.message, "Saved");
  assert.equal(scheduled.length, 1);
  assert.equal((await dbModule.listRecentSourceItems(1))[0].content, "Need to follow up with Sarah about pricing after the demo.");
  assert.deepEqual(await dbModule.listMemoriesForSource(json.sourceId), []);

  await scheduled[0]();

  assert.equal((await dbModule.listMemoriesForSource(json.sourceId)).length, 1);
});

test("shortcut capture API accepts plain text bodies from Shortcuts", async () => {
  const route = await importWithTempDb("../lib/capture-api.ts");
  const dbModule = await import(`../lib/db.ts?db=${Date.now()}-${Math.random()}`);
  const plainTextRequest = new Request("http://localhost/api/capture", {
    method: "POST",
    headers: {
      authorization: "Bearer test-capture-token",
      "content-type": "text/plain"
    },
    body: "Idea: home screen dictation should save immediately."
  });

  const response = await route.handleCaptureApiRequest(plainTextRequest, () => {});

  assert.equal(response.status, 201);
  assert.equal((await dbModule.listRecentSourceItems(1))[0].content, "Idea: home screen dictation should save immediately.");
});
