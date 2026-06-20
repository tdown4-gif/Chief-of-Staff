import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-youtube-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("youtube url detection extracts canonical url and video id", async () => {
  const { extractYouTubeReference } = await import("../lib/youtube.ts");

  assert.deepEqual(
    extractYouTubeReference("Watch this https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s"),
    {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ"
    }
  );
  assert.deepEqual(
    extractYouTubeReference("Short link https://youtu.be/dQw4w9WgXcQ?si=test"),
    {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ"
    }
  );
  assert.deepEqual(
    extractYouTubeReference("End of sentence https://youtu.be/dQw4w9WgXcQ."),
    {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ"
    }
  );
  assert.equal(extractYouTubeReference("No video here"), null);
});

test("youtube metadata fetch uses oembed when available and preserves transcript unavailable status", async () => {
  const { buildYouTubeSourceInput } = await import("../lib/youtube.ts");
  const response = {
    ok: true,
    json: async () => ({
      title: "AI Insurance Workflows",
      author_name: "Palms AI"
    })
  };
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(String(url));
    return response;
  };

  const input = await buildYouTubeSourceInput(
    7,
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    fetchImpl
  );

  assert.equal(input.sourceItemId, 7);
  assert.equal(input.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(input.videoId, "dQw4w9WgXcQ");
  assert.equal(input.title, "AI Insurance Workflows");
  assert.equal(input.channel, "Palms AI");
  assert.equal(input.tyNote, null);
  assert.equal(input.transcriptStatus, "unavailable");
  assert.equal(input.summary, null);
  assert.match(requests[0], /youtube\.com\/oembed/);
});

test("youtube context can be explicit or extracted from why-I-saved-this text", async () => {
  const { buildYouTubeSourceInput, extractYouTubeContext } = await import("../lib/youtube.ts");
  const fetchImpl = async () => ({ ok: false, json: async () => null });
  const rawCapture = [
    "https://youtu.be/dQw4w9WgXcQ",
    "Why I saved this: Useful example of how creator-led distribution creates durable recall."
  ].join("\n");

  assert.equal(
    extractYouTubeContext(rawCapture),
    "Useful example of how creator-led distribution creates durable recall."
  );

  const inferred = await buildYouTubeSourceInput(8, rawCapture, fetchImpl);
  const explicit = await buildYouTubeSourceInput(9, rawCapture, fetchImpl, "Tie this to the distribution strategy idea.");

  assert.equal(inferred.tyNote, "Useful example of how creator-led distribution creates durable recall.");
  assert.equal(explicit.tyNote, "Tie this to the distribution strategy idea.");
});

test("youtube sources persist metadata linked to exact raw capture", async () => {
  const dbModule = await importWithTempDb("../lib/db-local.ts");
  const raw = "Need context from https://www.youtube.com/watch?v=dQw4w9WgXcQ for Palms AI.";
  const source = dbModule.createSourceItem(raw, "youtube");
  const youtubeSource = dbModule.createYouTubeSource({
    sourceItemId: source.id,
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoId: "dQw4w9WgXcQ",
    title: "AI Insurance Workflows",
    channel: "Palms AI",
    tyNote: "Use this as a benchmark for insurance workflow content.",
    transcriptStatus: "unavailable",
    summary: null
  });

  const bySource = dbModule.listYouTubeSourcesForSources([source.id]);

  assert.equal(source.content, raw);
  assert.equal(source.sourceType, "youtube");
  assert.equal(bySource[source.id].id, youtubeSource.id);
  assert.equal(bySource[source.id].title, "AI Insurance Workflows");
  assert.equal(bySource[source.id].channel, "Palms AI");
  assert.equal(bySource[source.id].tyNote, "Use this as a benchmark for insurance workflow content.");
  assert.equal(bySource[source.id].transcriptStatus, "unavailable");
});
