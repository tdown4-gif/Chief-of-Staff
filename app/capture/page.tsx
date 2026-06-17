import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { CaptureList } from "@/components/CaptureList";
import { listMemoriesForSources, listRecentSourceItems } from "@/lib/db";

export const dynamic = "force-dynamic";

type CapturePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CapturePage({ searchParams }: CapturePageProps) {
  const params = await searchParams;
  const recentCaptures = listRecentSourceItems(5);
  const memoriesBySource = listMemoriesForSources(recentCaptures.map((item) => item.id));
  const error = params.error === "too-long"
    ? "That capture is unusually large. Keep it under 100,000 characters."
    : params.error === "empty"
      ? "Write something worth remembering before saving."
      : undefined;

  return (
    <main className="shell capture-shell">
      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Trusted External Memory</Link>
        <div className="nav-links">
          <Link className="nav-link" href="/inbox">Inbox</Link>
          <Link className="nav-link" href="/recall">Recall</Link>
        </div>
      </nav>

      <section className="hero capture-hero">
        <p className="section-label">Universal inbox</p>
        <h1>Capture now.</h1>
        <p>
          Save the raw source exactly as it arrives. No folders, tags, CRM fields, or dashboard work.
        </p>
      </section>

      <section style={{ marginTop: 18 }} aria-label="Capture form">
        <CaptureForm error={error} />
      </section>

      <section style={{ marginTop: 28 }} aria-label="Recent captures">
        <h2>Recent captures</h2>
        <CaptureList items={recentCaptures} memoriesBySource={memoriesBySource} />
      </section>
    </main>
  );
}
