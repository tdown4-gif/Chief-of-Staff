import assert from "node:assert/strict";
import test from "node:test";

const source = {
  id: 123,
  content: "Met Priya. Idea: trust layer for founder memory.",
  sourceType: "note",
  createdAt: "2026-06-17T12:00:00.000Z"
};

test("OpenAI provider sends a structured extraction request and parses JSON drafts", async () => {
  const requests = [];
  const { OpenAIResponsesJsonProvider } = await import("../lib/model-provider.ts");
  const provider = new OpenAIResponsesJsonProvider({
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            memories: [
              {
                kind: "idea",
                content: "trust layer for founder memory",
                confidence: 91,
                rationale: "The source explicitly labels this as an idea."
              }
            ]
          })
        }),
        { status: 200 }
      );
    }
  });

  const result = await provider.generateJson({
    schemaName: "memory_extraction",
    schema: { type: "object", additionalProperties: false, properties: {}, required: [] },
    system: "Extract memories.",
    user: "Idea: trust layer for founder memory."
  });

  assert.deepEqual(result, {
    memories: [
      {
        kind: "idea",
        content: "trust layer for founder memory",
        confidence: 91,
        rationale: "The source explicitly labels this as an idea."
      }
    ]
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.openai.com/v1/responses");
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.headers.Authorization, "Bearer test-key");
  const body = JSON.parse(requests[0].init.body);
  assert.equal(body.model, "test-model");
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.name, "memory_extraction");
});

test("default extractor stays deterministic without model provider environment", async () => {
  const { createDefaultExtractor } = await import("../lib/extraction.ts");

  const extractor = createDefaultExtractor({}, async () => {
    throw new Error("fetch should not be called");
  });
  const drafts = await extractor.extract(source);

  assert.ok(drafts.some((draft) => draft.kind === "person" && draft.content === "Priya"));
  assert.ok(drafts.some((draft) => draft.kind === "idea" && draft.content.includes("trust layer")));
});

test("model-backed extractor falls back to deterministic drafts when provider extraction fails", async () => {
  const { createDefaultExtractor } = await import("../lib/extraction.ts");
  let fetchCalls = 0;

  const extractor = createDefaultExtractor(
    {
      MODEL_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "test-model"
    },
    async () => {
      fetchCalls += 1;
      return new Response("not json", { status: 200 });
    }
  );
  const drafts = await extractor.extract(source);

  assert.equal(fetchCalls, 1);
  assert.ok(drafts.some((draft) => draft.kind === "person" && draft.content === "Priya"));
  assert.ok(drafts.some((draft) => draft.kind === "idea" && draft.content.includes("trust layer")));
});
