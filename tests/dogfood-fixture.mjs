export const dogfoodNotes = [
  "Met Mike at the coffee shop after the demo. Insurance agency owner in Tampa. Keeps losing renewal follow-through because notes are split between email, CRM, and paper.",
  "March 3, 2026. Idea: AI tool for insurance agencies that remembers renewal dates and suggests outreach before policies lapse.",
  "Met Sarah Chen from the founder dinner. She asked whether Palms AI could turn rambling voice notes into investor update bullets.",
  "Need to follow up with Sarah about pricing after the demo on July 12, 2026.",
  "Palms AI project: turn messy founder notes into structured venture briefs with source proof.",
  "Random: buy more coffee filters and replace the office HDMI cable.",
  "March 6, 2026. Idea: renewal workflow copilot for small insurance agencies that drafts customer follow-up using remembered context.",
  "Talked to Alex at the airport. He runs a boutique travel advisory and wants fewer tabs when planning client trips.",
  "Remember to send Dan the founder context after June 2026.",
  "Idea: one-tap iPhone capture that opens Trusted External Memory directly to /capture.",
  "Met Mike again. Insurance agency owner. He said the valuable part is remembering when each customer renewal is coming up, not making another dashboard.",
  "March 11, 2026. Idea: AI business that watches renewal follow-up gaps for independent insurance agencies.",
  "Spoke with John Rivera about demo notes and the onboarding flow.",
  "Need to meet the vendor about pricing, then write down what changed.",
  "Travel thought: Miami in August is probably too hot for a relaxed product retreat.",
  "Project: clean up Chief of Staff repo naming so it says Trusted External Memory first.",
  "March 14, 2026. Idea: founder memory system that turns chaotic daily notes into people, projects, ideas, and commitments.",
  "Met Priya. She builds Ops systems for agencies and cares about reliable recall more than automation.",
  "Remember to ask Mike for three anonymized renewal examples.",
  "Idea: lightweight source confidence score so Ty can tell whether a memory came from raw text, a link, or a document.",
  "Random: the left monitor flickers when the USB hub is warm.",
  "Palms AI project: evaluate whether venture briefs should include direct quotes from founder notes.",
  "Need to follow up with John Rivera about onboarding friction next week.",
  "March 18, 2026. Idea: insurance renewal memory that notices the same customer follow-up pattern across multiple notes.",
  "Talked to Morgan about SBIR tracking. Defer it until memory retrieval actually works.",
  "Document note: pasted a rough operating model that says capture beats categorization.",
  "Met Elena at the gym. She runs a design studio and wants a better way to remember client preferences.",
  "Travel note: if going to New York for meetings, keep mornings open for writing.",
  "Need to send Claude the repo review notes after Codex pushes the next chunk.",
  "Idea: inbox triage should propose memories but never force Ty to review every item.",
  "March 22, 2026. Idea: AI chief of staff should start as trusted external memory, not calendar automation.",
  "Met Mike's operations lead, Carla. She handles renewals and says follow-up slips happen after calls, not during them.",
  "Remember to compare deterministic extraction with model-backed extraction on the 50-note dogfood set.",
  "Random: new notebook has the blue cover.",
  "Palms AI project: build a rubric for founder notes that separates facts, assumptions, and open loops.",
  "Link: https://example.com/insurance-renewal-workflow reference about renewal timelines and customer outreach.",
  "March 25, 2026. Idea: renewal follow-through assistant for insurance agencies that texts the producer before the deadline.",
  "Spoke with Maya about travel planning. She thinks recommendations only matter if the system remembers constraints.",
  "Need to follow up with Priya about agency ops examples.",
  "Project: Trusted External Memory PWA should be usable from laptop and iPhone home screen before native iOS.",
  "Idea: relationship memory could later sit on top of source-backed capture, but not in V1.",
  "Met Omar. He asked if the system can remember investor objections across calls.",
  "Remember to write down why native iPhone is deferred until the memory loop works.",
  "Random: cancel the duplicate music subscription.",
  "March 29, 2026. Idea: insurance agencies need memory around renewal dates, promised follow-ups, and client preferences.",
  "Document note: V1 test questions are insurance guy, March AI ideas, recent commitments, forgetting, and repeated insurance AI ideas.",
  "Need to follow up with Mike about whether renewal outreach should be email-first or SMS-first.",
  "Palms AI project: use source-backed recall to find repeated founder themes before drafting a brief.",
  "Travel thought: Austin trip should avoid SXSW week if meetings need quiet.",
  "Idea: model provider hook should improve extraction but never block raw capture."
];

export const dogfoodQueries = [
  {
    id: "insurance-guy",
    question: "Who was that insurance guy I met?",
    expectedResultCount: 1,
    expectedNeedles: ["Mike", "Insurance agency owner"],
    allowedNeedles: ["Mike", "insurance agency", "renewal"]
  },
  {
    id: "march-ai-business-ideas",
    question: "What were my AI business ideas from March?",
    expectedResultCount: 4,
    expectedNeedles: [
      "insurance agencies",
      "founder memory system",
      "trusted external memory",
      "renewal follow-through assistant"
    ],
    allowedNeedles: ["March", "Idea:", "AI", "insurance", "founder", "renewal", "memory"]
  },
  {
    id: "recent-commitments",
    question: "What commitments have I made recently?",
    expectedResultCount: 5,
    expectedNeedles: ["Sarah about pricing", "send Dan", "ask Mike", "follow up with Priya", "follow up with Mike"],
    allowedNeedles: ["Need to", "Remember to", "follow up", "send", "ask", "compare", "write down"]
  },
  {
    id: "forgetting",
    question: "What am I forgetting?",
    expectedResultCount: 5,
    expectedNeedles: ["Sarah about pricing", "send Dan", "ask Mike", "compare deterministic extraction", "native iPhone is deferred"],
    allowedNeedles: ["Need to", "Remember to", "follow up", "send", "ask", "compare", "write down"]
  },
  {
    id: "repeated-insurance-ai-ideas",
    question: "What were the insurance AI ideas I mentioned more than once?",
    expectedResultCount: 4,
    expectedNeedles: ["renewal dates", "renewal workflow copilot", "renewal follow-up gaps", "renewal follow-through assistant"],
    allowedNeedles: ["insurance", "renewal", "agencies", "outreach", "follow-up"]
  }
];

function includesAny(value, needles) {
  const lower = value.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function resultText(result) {
  return [result.memory?.content, result.memory?.rationale, result.source.content, result.sourceSnippet]
    .filter(Boolean)
    .join("\n");
}

export async function seedDogfoodNotes({ dbModule, extractionModule }) {
  const sources = [];
  const extractionResults = [];

  for (const note of dogfoodNotes) {
    const sourceType = note.startsWith("Link:") ? "link" : note.startsWith("Document note:") ? "document" : "text";
    const source = dbModule.createSourceItem(note, sourceType);
    sources.push(source);
    extractionResults.push(await extractionModule.extractAndStoreMemoriesForSource(source));
  }

  return {
    sources,
    extractionResults,
    memories: extractionResults.flatMap((result) => result.memories),
    openLoops: dbModule.listOpenCommitments()
  };
}

export async function evaluateDogfoodRecall({ recall }) {
  const queryReports = await Promise.all(dogfoodQueries.map(async (query) => {
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
      expectedResultCount: query.expectedResultCount,
      missing,
      falsePositives,
      topResults: results.slice(0, 5).map((result) => ({
        sourceId: result.source.id,
        kind: result.memory?.kind ?? "source",
        memory: result.memory?.content ?? null,
        sourceSnippet: result.sourceSnippet
      }))
    };
  }));

  return {
    noteCount: dogfoodNotes.length,
    queryCount: dogfoodQueries.length,
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
    queryReports
  };
}
