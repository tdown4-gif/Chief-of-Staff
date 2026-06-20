import type { CreateYouTubeSourceInput } from "./db-types.ts";

export type YouTubeReference = {
  url: string;
  videoId: string;
};

type YouTubeOEmbedResponse = {
  title?: unknown;
  author_name?: unknown;
};

function canonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function videoIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    const shortsMatch = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    const embedMatch = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
    if (embedMatch) {
      return embedMatch[1];
    }
  }

  return null;
}

export function extractYouTubeReference(content: string): YouTubeReference | null {
  const urlPattern = /https?:\/\/[^\s<>"']+/g;

  for (const match of content.matchAll(urlPattern)) {
    try {
      const url = new URL(match[0].replace(/[),.!?;:]+$/, ""));
      const videoId = videoIdFromUrl(url);
      if (videoId) {
        return {
          url: canonicalYouTubeUrl(videoId),
          videoId
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchYouTubeOEmbed(url: string, fetchImpl: typeof fetch): Promise<YouTubeOEmbedResponse | null> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("format", "json");

  const response = await fetchImpl(endpoint);
  if (!response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as YouTubeOEmbedResponse | null;
}

export async function buildYouTubeSourceInput(
  sourceItemId: number,
  contentOrUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<CreateYouTubeSourceInput | null> {
  const reference = extractYouTubeReference(contentOrUrl) ?? extractYouTubeReference(`https://www.youtube.com/watch?v=${contentOrUrl}`);
  if (!reference) {
    return null;
  }

  const metadata = await fetchYouTubeOEmbed(reference.url, fetchImpl).catch(() => null);
  const title = typeof metadata?.title === "string" && metadata.title.trim() ? metadata.title.trim() : null;
  const channel = typeof metadata?.author_name === "string" && metadata.author_name.trim()
    ? metadata.author_name.trim()
    : null;

  return {
    sourceItemId,
    url: reference.url,
    videoId: reference.videoId,
    title,
    channel,
    transcriptStatus: "unavailable",
    summary: null
  };
}
