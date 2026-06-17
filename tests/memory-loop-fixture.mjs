export const memoryLoopCases = [
  {
    id: "person-mike-insurance",
    note: "Met Mike after the demo. Insurance agency owner. He keeps losing renewal follow-through in scattered notes.",
    expectedKinds: ["person"],
    expectedMemories: [{ kind: "person", includes: "Mike" }]
  },
  {
    id: "person-mike-follow-up-context",
    note: "Met Mike. Insurance agency owner. Interested in AI workflows for renewals and customer follow-up.",
    expectedKinds: ["person"],
    expectedMemories: [{ kind: "person", includes: "Mike" }]
  },
  {
    id: "idea-insurance-outreach",
    note: "Idea: AI tool for insurance agencies that remembers renewal dates and suggests outreach.",
    expectedKinds: ["idea"],
    expectedMemories: [{ kind: "idea", includes: "insurance agencies" }]
  },
  {
    id: "project-palms-ai",
    note: "Palms AI project: turn messy founder notes into structured venture briefs.",
    expectedKinds: ["project"],
    expectedMemories: [{ kind: "project", includes: "Palms AI" }]
  },
  {
    id: "commitment-sarah-pricing",
    note: "Need to follow up with Sarah about pricing after the demo on July 12, 2026.",
    expectedKinds: ["commitment"],
    expectedMemories: [{ kind: "commitment", includes: "Sarah about pricing" }],
    expectedExplicitDates: ["2026-07-12"],
    expectedOpenLoops: ["Sarah about pricing"]
  },
  {
    id: "benign-household-note",
    note: "Archived receipts, cleaned the desktop, and watched a movie.",
    expectedKinds: [],
    expectedMemories: []
  },
  {
    id: "person-john-rivera",
    note: "Spoke with John Rivera about demo notes and the onboarding flow.",
    expectedKinds: ["person"],
    expectedMemories: [{ kind: "person", includes: "John Rivera" }]
  },
  {
    id: "commitment-founder-context",
    note: "Remember to send Dan the founder context after June 2026.",
    expectedKinds: ["commitment"],
    expectedMemories: [{ kind: "commitment", includes: "send Dan the founder context" }],
    expectedExplicitDates: ["2026-06"],
    expectedOpenLoops: ["send Dan the founder context"]
  },
  {
    id: "lowercase-meeting-commitment",
    note: "Need to meet the vendor about pricing, then write down what changed.",
    expectedKinds: ["commitment"],
    expectedMemories: [{ kind: "commitment", includes: "meet the vendor about pricing" }],
    expectedOpenLoops: ["meet the vendor about pricing"]
  }
];

export const memoryLoopRecallQueries = [
  {
    question: "What was the AI idea for insurance agencies?",
    expectedKind: "idea",
    expectedMemoryIncludes: "insurance agencies",
    expectedSourceIncludes: "remembers renewal dates",
    expectedSnippetIncludes: "insurance agencies"
  },
  {
    question: "Who was John Rivera?",
    expectedKind: "person",
    expectedMemoryIncludes: "John Rivera",
    expectedSourceIncludes: "demo notes",
    expectedSnippetIncludes: "John Rivera"
  },
  {
    question: "What commitments have I made recently?",
    expectedKind: "commitment",
    expectedMemoryIncludes: "Sarah about pricing",
    expectedSourceIncludes: "July 12, 2026",
    expectedSnippetIncludes: "Sarah about pricing"
  }
];

function includesText(value, expected) {
  return value.toLowerCase().includes(expected.toLowerCase());
}

function summarize(checks) {
  return {
    matched: checks.filter((check) => check.matched).length,
    total: checks.length
  };
}

function buildMemoriesByCase({ cases, sources, memories }) {
  const caseBySourceId = new Map(sources.map((source, index) => [source.id, cases[index]]));
  const memoriesByCaseId = new Map(cases.map((item) => [item.id, []]));

  for (const memory of memories) {
    const item = caseBySourceId.get(memory.sourceItemId);
    if (item) {
      memoriesByCaseId.get(item.id).push(memory);
    }
  }

  return { caseBySourceId, memoriesByCaseId };
}

function checkExpectedKinds({ cases, memoriesByCaseId }) {
  return cases.flatMap((item) =>
    item.expectedKinds.map((kind) => ({
      matched: memoriesByCaseId.get(item.id).some((memory) => memory.kind === kind),
      failure: `${item.id}: expected ${kind} memory`
    }))
  );
}

function checkExpectedMemories({ cases, memoriesByCaseId }) {
  return cases.flatMap((item) =>
    (item.expectedMemories ?? []).map((expected) => ({
      matched: memoriesByCaseId
        .get(item.id)
        .some((memory) => memory.kind === expected.kind && includesText(memory.content, expected.includes)),
      failure: `${item.id}: expected ${expected.kind} memory containing "${expected.includes}"`
    }))
  );
}

function checkExpectedDates({ cases, memoriesByCaseId }) {
  return cases.flatMap((item) =>
    (item.expectedExplicitDates ?? []).map((expectedDate) => ({
      matched: memoriesByCaseId.get(item.id).some((memory) => includesText(memory.metadataJson ?? "", expectedDate)),
      failure: `${item.id}: expected explicit date metadata "${expectedDate}"`
    }))
  );
}

function checkExpectedOpenLoops({ cases, sources, openLoops }) {
  return cases.flatMap((item, index) =>
    (item.expectedOpenLoops ?? []).map((expectedText) => ({
      matched: openLoops.some(
        (loop) => loop.source.id === sources[index].id && includesText(loop.memory.content, expectedText)
      ),
      failure: `${item.id}: expected open loop containing "${expectedText}"`
    }))
  );
}

async function checkExpectedRecall({ recall }) {
  return Promise.all(memoryLoopRecallQueries.map(async (expected) => {
    const results = await recall(expected.question);
    const matched = results.some(
      (result) =>
        result.memory?.kind === expected.expectedKind &&
        includesText(result.memory.content, expected.expectedMemoryIncludes) &&
        includesText(result.source.content, expected.expectedSourceIncludes) &&
        includesText(result.sourceSnippet, expected.expectedSnippetIncludes)
    );

    return {
      matched,
      failure: `recall "${expected.question}": expected ${expected.expectedKind} memory containing "${expected.expectedMemoryIncludes}"`
    };
  }));
}

function findUnexpectedMemories({ caseBySourceId, memories }) {
  return memories.filter((memory) => {
    const item = caseBySourceId.get(memory.sourceItemId);
    return item && !item.expectedKinds.includes(memory.kind);
  });
}

function findUnexpectedOpenLoops({ caseBySourceId, openLoops }) {
  return openLoops.filter((loop) => {
    const item = caseBySourceId.get(loop.source.id);
    if (!item) {
      return false;
    }

    const expectedOpenLoops = item.expectedOpenLoops ?? [];
    return !expectedOpenLoops.some((expectedText) => includesText(loop.memory.content, expectedText));
  });
}

export async function evaluateMemoryLoopFixture({ cases, sources, memories, openLoops, recall }) {
  const { caseBySourceId, memoriesByCaseId } = buildMemoriesByCase({ cases, sources, memories });
  const kindChecks = checkExpectedKinds({ cases, memoriesByCaseId });
  const memoryChecks = checkExpectedMemories({ cases, memoriesByCaseId });
  const dateChecks = checkExpectedDates({ cases, memoriesByCaseId });
  const openLoopChecks = checkExpectedOpenLoops({ cases, sources, openLoops });
  const recallChecks = await checkExpectedRecall({ recall });
  const unexpectedMemories = findUnexpectedMemories({ caseBySourceId, memories });
  const unexpectedOpenLoops = findUnexpectedOpenLoops({ caseBySourceId, openLoops });

  const failures = [
    ...kindChecks,
    ...memoryChecks,
    ...dateChecks,
    ...openLoopChecks,
    ...recallChecks
  ]
    .filter((check) => !check.matched)
    .map((check) => check.failure);

  failures.push(
    ...unexpectedMemories.map(
      (memory) => `${caseBySourceId.get(memory.sourceItemId).id}: unexpected ${memory.kind} memory "${memory.content}"`
    ),
    ...unexpectedOpenLoops.map(
      (loop) => `${caseBySourceId.get(loop.source.id).id}: unexpected open loop "${loop.memory.content}"`
    )
  );

  return {
    kindCoverage: summarize(kindChecks),
    memoryCoverage: summarize(memoryChecks),
    dateCoverage: summarize(dateChecks),
    openLoopCoverage: summarize(openLoopChecks),
    recallCoverage: summarize(recallChecks),
    unexpectedMemoryCount: unexpectedMemories.length,
    unexpectedOpenLoopCount: unexpectedOpenLoops.length,
    failures
  };
}
