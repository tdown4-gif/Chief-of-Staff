import Link from "next/link";
import { CaptureList } from "@/components/CaptureList";
import { countSourceItems, listRecentSourceItems } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function InboxPage({ searchParams }: { searchParams: Promise<{ captured?: string }> }) {
  return <InboxContent searchParams={searchParams} />;
}

async function InboxContent({ searchParams }: { searchParams: Promise<{ captured?: string }> }) {
  const params = await searchParams;
  const items = listRecentSourceItems(30);
  const total = countSourceItems();

  return (
    <main className="shell">
      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Trusted External Memory</Link>
        <div className="nav-links">
          <Link className="nav-link" href="/capture">Capture</Link>
        </div>
      </nav>

      <section className="hero">
        <p className="section-label">Universal inbox</p>
        <h1>Recent source items.</h1>
        <p>
          {total} raw capture{total === 1 ? "" : "s"} preserved. This is source-backed memory ground zero.
        </p>
        {params.captured ? <p className="hint">Saved. The raw source item is now in the inbox.</p> : null}
      </section>

      <section style={{ marginTop: 28 }} aria-label="Inbox captures">
        <CaptureList items={items} />
      </section>
    </main>
  );
}
