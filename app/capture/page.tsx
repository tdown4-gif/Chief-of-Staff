import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { CaptureList } from "@/components/CaptureList";
import { listMemoriesForSources, listRecentSourceItems, listYouTubeSourcesForSources } from "@/lib/db";

export const dynamic = "force-dynamic";

type CapturePageProps = {
  searchParams: Promise<{ captured?: string; error?: string; memoryUpdated?: string }>;
};

export default async function CapturePage({ searchParams }: CapturePageProps) {
  const params = await searchParams;
  const recentCaptures = await listRecentSourceItems(5);
  const sourceIds = recentCaptures.map((item) => item.id);
  const [memoriesBySource, youtubeSourcesBySource] = await Promise.all([
    listMemoriesForSources(sourceIds),
    listYouTubeSourcesForSources(sourceIds)
  ]);
  const error = params.error === "too-long"
    ? "That capture is unusually large. Keep it under 100,000 characters."
    : params.error === "empty"
      ? "Write something worth remembering before saving."
      : undefined;

  return (
    <main className="shell capture-shell">
      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Memory</Link>
        <div className="nav-links">
          <Link className="nav-link" href="/">Home</Link>
          <Link className="nav-link" href="/inbox">Inbox</Link>
          <Link className="nav-link" href="/recall">Recall</Link>
          <Link className="nav-link" href="/open-loops">Open loops</Link>
        </div>
      </nav>

      <section aria-label="Capture form">
        <CaptureForm captured={params.captured === "1"} error={error} />
      </section>

      <section className="daily-section" aria-label="Recent captures">
        <h2>Recent captures</h2>
        {params.memoryUpdated ? <p className="hint">Memory review saved.</p> : null}
        <CaptureList
          items={recentCaptures}
          memoriesBySource={memoriesBySource}
          youtubeSourcesBySource={youtubeSourcesBySource}
          returnTo="/capture"
        />
      </section>
    </main>
  );
}
