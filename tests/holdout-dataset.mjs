export const holdoutNotes = [
  "voice: met Rachel at founder breakfast, fintech ops? said memory only works if source snippets are obvious.",
  "Family: ask Dad if the insurance card arrived. not Medicare this time.",
  "Palms AI: founder brief should show contradiction list when notes disagree.",
  "YouTube: video idea about why clean demos hide the hard parts of AI apps.",
  "Travel: Denver trip, altitude headache last time, arrive a day early if important.",
  "Need to send Rachel the source proof screenshot after the next demo.",
  "Conference note: tall guy named Ben or Bennett from agency software, said producers forget post-call promises.",
  "Idea: memory inbox should preserve dumb fragments because fragments are how real notes start.",
  "Mom reminder: check whether garden store has the blue ceramic planter.",
  "Project Trusted External Memory: chaos eval should stay ugly, not optimized for vanity score.",
  "voice typo: palms founder bref needs evidence trail and objections section.",
  "Business opp maybe: compliance memory for small firms, but probably defer.",
  "Need to ask Carla whether renewal examples can include anonymized dates.",
  "YouTube: title maybe 'your second brain is a junk drawer'.",
  "Travel: Seattle in November probably rainy, pack waterproof shoes.",
  "Met Nina, runs small bookkeeping shop. client preference memory might matter later, not V1.",
  "Family floating: Emily dinner, Dad insurance card, Mom planter.",
  "Idea: recall should say 'I found raw notes, not confirmed memory' when extraction misses.",
  "Need to follow up with Ben/Bennett about agency software notes.",
  "Random: replace kitchen lightbulb and return printer cable."
];

export const holdoutQueries = [
  {
    id: "rachel-source-proof",
    question: "What do I owe Rachel?",
    expectedNeedles: ["Rachel", "source proof screenshot"],
    allowedNeedles: ["Rachel", "source proof", "screenshot", "demo"]
  },
  {
    id: "ben-bennett",
    question: "Who was Ben from agency software?",
    expectedNeedles: ["Ben", "agency software"],
    allowedNeedles: ["Ben", "Bennett", "agency software", "post-call promises", "producers"]
  },
  {
    id: "palms-brief-holdout",
    question: "What Palms founder brief ideas came up?",
    expectedNeedles: ["contradiction list", "evidence trail", "objections section"],
    allowedNeedles: ["Palms", "founder", "brief", "bref", "contradiction", "evidence", "objections"]
  },
  {
    id: "family-holdout",
    question: "What family reminders are floating?",
    expectedNeedles: ["Dad insurance card", "Mom planter", "Emily dinner"],
    allowedNeedles: ["Family", "Dad", "insurance card", "Mom", "planter", "Emily", "dinner"]
  },
  {
    id: "raw-notes-trust",
    question: "What did I say about raw notes versus confirmed memory?",
    expectedNeedles: ["raw notes", "confirmed memory"],
    allowedNeedles: ["raw notes", "confirmed memory", "fragments", "extraction misses"]
  }
];

function normalize(value) {
  return value.toLowerCase();
}

function includesAny(value, needles) {
  const lower = normalize(value);
  return needles.some((needle) => lower.includes(normalize(needle)));
}

function resultText(result) {
  return [result.memory?.content, result.memory?.rationale, result.source.content, result.sourceSnippet]
    .filter(Boolean)
    .join("\n");
}

export async function seedHoldoutDataset({ dbModule, extractionModule }) {
  const sources = [];
  const extractionResults = [];

  for (const note of holdoutNotes) {
    const source = dbModule.createSourceItem(note, note.startsWith("Conference") || note.startsWith("Met ") ? "contact" : "text");
    sources.push(source);
    extractionResults.push(await extractionModule.extractAndStoreMemoriesForSource(source));
  }

  return {
    sources,
    memories: extractionResults.flatMap((result) => result.memories),
    openLoops: dbModule.listOpenCommitments()
  };
}

export async function evaluateHoldoutRecall({ recall }) {
  const queryReports = await Promise.all(holdoutQueries.map(async (query) => {
    const results = await recall(query.question, 10);
    const missing = query.expectedNeedles.filter((needle) => !results.some((result) => includesAny(resultText(result), [needle])));
    const falsePositives = results
      .filter((result) => !includesAny(resultText(result), query.allowedNeedles))
      .map((result) => ({
        sourceId: result.source.id,
        kind: result.memory?.kind ?? "source",
        text: result.memory?.content ?? result.sourceSnippet
      }));

    return {
      id: query.id,
      question: query.question,
      resultCount: results.length,
      missing,
      falsePositives,
      sourceBacked: results.every((result) => result.sourceSnippet.length > 0),
      topResults: results.slice(0, 5).map((result) => ({
        sourceId: result.source.id,
        kind: result.memory?.kind ?? "source",
        resultType: result.resultType,
        confidence: result.memory?.confidence ?? null,
        status: result.memory?.status ?? null,
        memory: result.memory?.content ?? null,
        sourceSnippet: result.sourceSnippet
      }))
    };
  }));

  return {
    noteCount: holdoutNotes.length,
    queryCount: holdoutQueries.length,
    misses: queryReports.flatMap((report) =>
      report.missing.map((needle) => ({ queryId: report.id, question: report.question, missing: needle }))
    ),
    falsePositives: queryReports.flatMap((report) =>
      report.falsePositives.map((falsePositive) => ({
        queryId: report.id,
        question: report.question,
        ...falsePositive
      }))
    ),
    sourceBackedQueryCount: queryReports.filter((report) => report.sourceBacked).length,
    queryReports
  };
}
