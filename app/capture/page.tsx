import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { CaptureList } from "@/components/CaptureList";
import { listRecentSourceItems } from "@/lib/db";

export const dynamic = "force-dynamic";

type CapturePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CapturePage({ searchParams }: CapturePageProps) {
  const params = await searchParams;
  const recentCaptures = listRecentSourceItems(5);
  const error = params.error === "too-long"
    ? "Capture is too long for v0. Keep it under 10,000 characters."
    : params.error === "empty"
      ? "Write something worth remembering before saving."
      : undefined;

  return (
    <main className="shell">
      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Trusted External Memory</Link>
        <div className="nav-links">
          <Link className="nav-link" href="/inbox">Inbox</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">Universal inbox</div>
        <h1>Capture now. Organize later.</h1>
        <p>
          Save the raw source exactly as it arrives. V0 deliberately avoids folders, tags, CRM fields,
          dashboards, and future Chief-of-Staff features.
        </p>
      </section>

      <section style={{ marginTop: 18 }} aria-label="Capture form">
        <CaptureForm error={error} />
      </section>

      <section style={{ marginTop: 28 }} aria-label="Recent captures">
        <h2>Recent captures</h2>
        <CaptureList items={recentCaptures} />
      </section>
    </main>
  );
}
