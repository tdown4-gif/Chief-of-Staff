import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateTyChaosRecall, seedTyChaosDataset, tyChaosNotes } from "../tests/ty-chaos-dataset.mjs";

const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-ty-chaos-report-"));
const cacheBuster = `${Date.now()}-${Math.random()}`;
process.env.DATABASE_URL = `file:${path.join(dir, "chaos.db")}`;

const dbModule = await import(`../lib/db.ts?chaos=${cacheBuster}`);
const extractionModule = await import(`../lib/extraction.ts?chaos=${cacheBuster}`);
const recallModule = await import(`../lib/recall.ts?chaos=${cacheBuster}`);
const seeded = await seedTyChaosDataset({ dbModule, extractionModule });
const report = evaluateTyChaosRecall({ recall: recallModule.recall, memories: seeded.memories });

function printIssueList(title, items, formatter) {
  console.log(`${title}: ${items.length}`);
  for (const item of items.slice(0, 12)) {
    console.log(`- ${formatter(item)}`);
  }
  if (items.length > 12) {
    console.log(`- ... ${items.length - 12} more`);
  }
  console.log("");
}

console.log("Ty Chaos Dataset recall eval");
console.log(`Notes seeded: ${tyChaosNotes.length}`);
console.log(`Sources stored: ${seeded.sources.length}`);
console.log(`Memories extracted: ${seeded.memories.length}`);
console.log(`Open loops: ${seeded.openLoops.length}`);
console.log(`Queries: ${report.queryCount}`);
console.log("");

printIssueList("Misses", report.misses, (item) => `${item.queryId}: missing "${item.missing}"`);
printIssueList("False positives", report.falsePositives, (item) => `${item.queryId}: #${item.sourceId} ${item.kind} "${item.text}"`);
printIssueList(
  "Ambiguous retrievals",
  report.ambiguousRetrievals,
  (item) => `${item.queryId}: matched ambiguous clue "${item.needle}" in ${item.resultCount} result(s)`
);
printIssueList("Missing context", report.missingContext, (item) => `${item.queryId}: missing context "${item.missing}"`);
printIssueList(
  "Weak confidence scores",
  report.weakConfidenceScores,
  (item) => `#${item.sourceItemId} ${item.kind} ${item.confidence}% "${item.content}"`
);

for (const queryReport of report.queryReports) {
  console.log(`Q: ${queryReport.question}`);
  console.log(
    `Results: ${queryReport.resultCount} | misses ${queryReport.missing.length} | false positives ${queryReport.falsePositives.length} | ambiguous ${queryReport.ambiguous.length} | missing context ${queryReport.missingContext.length}`
  );
  for (const result of queryReport.topResults) {
    console.log(`- #${result.sourceId} ${result.kind}${result.confidence === null ? "" : ` ${result.confidence}%`}: ${result.memory ?? result.sourceSnippet}`);
  }
  console.log("");
}
