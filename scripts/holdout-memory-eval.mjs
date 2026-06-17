import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateHoldoutRecall, holdoutNotes, seedHoldoutDataset } from "../tests/holdout-dataset.mjs";

const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-holdout-report-"));
const cacheBuster = `${Date.now()}-${Math.random()}`;
process.env.DATABASE_URL = `file:${path.join(dir, "holdout.db")}`;

const dbModule = await import(`../lib/db.ts?holdout=${cacheBuster}`);
const extractionModule = await import(`../lib/extraction.ts?holdout=${cacheBuster}`);
const recallModule = await import(`../lib/recall.ts?holdout=${cacheBuster}`);
const seeded = await seedHoldoutDataset({ dbModule, extractionModule });
const report = evaluateHoldoutRecall({ recall: recallModule.recall });

console.log("Holdout recall eval");
console.log(`Notes seeded: ${holdoutNotes.length}`);
console.log(`Sources stored: ${seeded.sources.length}`);
console.log(`Memories extracted: ${seeded.memories.length}`);
console.log(`Open loops: ${seeded.openLoops.length}`);
console.log(`Queries: ${report.queryCount}`);
console.log(`Misses: ${report.misses.length}`);
console.log(`False positives: ${report.falsePositives.length}`);
console.log(`Source-backed queries: ${report.sourceBackedQueryCount}/${report.queryCount}`);
console.log("");

for (const queryReport of report.queryReports) {
  console.log(`Q: ${queryReport.question}`);
  console.log(`Results: ${queryReport.resultCount} | misses ${queryReport.missing.length} | false positives ${queryReport.falsePositives.length} | source-backed ${queryReport.sourceBacked ? "yes" : "no"}`);
  for (const result of queryReport.topResults) {
    console.log(`- #${result.sourceId} ${result.kind} ${result.resultType}${result.confidence === null ? "" : ` ${result.confidence}%`}: ${result.memory ?? result.sourceSnippet}`);
  }
  console.log("");
}
