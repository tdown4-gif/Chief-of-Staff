type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type JsonModelRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  system: string;
  user: string;
};

export type JsonModelProvider = {
  generateJson(request: JsonModelRequest): Promise<JsonValue>;
};

export type ModelProviderEnv = Record<string, string | undefined>;

export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

type OpenAIResponsesJsonProviderOptions = {
  apiKey: string;
  model: string;
  fetchImpl?: FetchImpl;
};

function extractResponseText(responseJson: unknown): string {
  if (typeof responseJson !== "object" || responseJson === null) {
    throw new Error("Model provider returned an invalid response.");
  }

  if ("output_text" in responseJson && typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  if ("output" in responseJson && Array.isArray(responseJson.output)) {
    const text = responseJson.output
      .flatMap((item) => (typeof item === "object" && item !== null && "content" in item && Array.isArray(item.content) ? item.content : []))
      .map((content) => (typeof content === "object" && content !== null && "text" in content ? content.text : null))
      .filter((text): text is string => typeof text === "string")
      .join("");

    if (text) {
      return text;
    }
  }

  throw new Error("Model provider response did not include JSON text.");
}

export class OpenAIResponsesJsonProvider implements JsonModelProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: FetchImpl;

  constructor(options: OpenAIResponsesJsonProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateJson(request: JsonModelRequest): Promise<JsonValue> {
    const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          { role: "system", content: request.system },
          { role: "user", content: request.user }
        ],
        text: {
          format: {
            type: "json_schema",
            name: request.schemaName,
            schema: request.schema,
            strict: true
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Model provider request failed with status ${response.status}.`);
    }

    return JSON.parse(extractResponseText(await response.json())) as JsonValue;
  }
}

export function createModelProviderFromEnv(
  env: ModelProviderEnv = process.env,
  fetchImpl: FetchImpl = fetch
): JsonModelProvider | null {
  const provider = env.MODEL_PROVIDER?.trim().toLowerCase();
  const apiKey = env.OPENAI_API_KEY?.trim();

  if ((provider === "openai" || (!provider && apiKey)) && apiKey) {
    return new OpenAIResponsesJsonProvider({
      apiKey,
      model: env.OPENAI_MODEL?.trim() || "gpt-5.1-mini",
      fetchImpl
    });
  }

  return null;
}
