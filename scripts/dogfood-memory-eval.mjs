import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dogfoodNotes, evaluateDogfoodRecall, seedDogfoodNotes } from "../tests/dogfood-fixture.mjs";

const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-dogfood-report-"));
const cacheBuster = `${Date.now()}-${Math.random()}`;
process.env.DATABASE_URL = `file:${path.join(dir, "dogfood.db")}`;

const dbModule = await import(`../lib/db.ts?dogfood=${cacheBuster}`);
const extractionModule = await import(`../lib/extraction.ts?dogfood=${cacheBuster}`);
const recallModule = await import(`../lib/recall.ts?dogfood=${cacheBuster}`);
const seeded = await seedDogfoodNotes({ dbModule, extractionModule });
const report = evaluateDogfoodRecall({ recall: recallModule.recall });

console.log(`Dogfood memory eval`);
console.log(`Notes seeded: ${dogfoodNotes.length}`);
console.log(`Sources stored: ${seeded.sources.length}`);
console.log(`Memories extracted: ${seeded.memories.length}`);
console.log(`Open loops: ${seeded.openLoops.length}`);
console.log(`Misses: ${report.misses.length}`);
console.log(`False positives: ${report.falsePositives.length}`);
console.log("");

for (const queryReport of report.queryReports) {
  console.log(`Q: ${queryReport.question}`);
  console.log(`Results: ${queryReport.resultCount}`);
  console.log(`Missing: ${queryReport.missing.length ? queryReport.missing.join(", ") : "none"}`);
  console.log(`False positives: ${queryReport.falsePositives.length}`);
  for (const result of queryReport.topResults) {
    console.log(`- #${result.sourceId} ${result.kind}: ${result.memory ?? result.sourceSnippet}`);
  }
  console.log("");
}
