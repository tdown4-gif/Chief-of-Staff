import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-recall-feedback-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("recall feedback actions persist not relevant promote and add context signals", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const actions = await import("../app/recall/actions.ts");
  const source = dbModule.createSourceItem("Family reminder: Dad Medicare letter follow up. ask if he mailed forms.", "text");

  await assert.rejects(
    actions.saveRecallFeedback(
      new Map([
        ["query", "Dad Medicare"],
        ["action", "unsupported"],
        ["sourceItemId", `${source.id}`]
      ])
    ),
    /valid feedback action/
  );

  for (const action of ["not_relevant", "promote_to_memory", "add_context"]) {
    await actions.saveRecallFeedback(
      new Map([
        ["query", "Dad Medicare"],
        ["action", action],
        ["sourceItemId", `${source.id}`],
        ["note", "Needs better family reminder context."]
      ])
    );
  }

  assert.deepEqual(
    dbModule.listRecallFeedback().map((feedback) => feedback.action),
    ["add_context", "promote_to_memory", "not_relevant"]
  );
});
