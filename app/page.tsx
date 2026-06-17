import Link from "next/link";
import { confidenceBadgeClass, getExtractionConfidence } from "@/lib/confidence";
import { listMemoriesNeedingReview, listOpenCommitments, listRecentSourceItems } from "@/lib/db";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

function snippet(content: string, maxLength = 150): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

export default function Home() {
  const recentCaptures = listRecentSourceItems(5);
  const openLoops = listOpenCommitments(5);
  const memoriesNeedingReview = listMemoriesNeedingReview(5);

  return (
    <main className="shell daily-shell">
      <nav className="nav" aria-label="Main navigation">
        <strong>Memory</strong>
        <div className="nav-links">
          <Link className="nav-link" href="/capture">Capture</Link>
          <Link className="nav-link" href="/recall">Recall</Link>
          <Link className="nav-link" href="/inbox">Inbox</Link>
        </div>
      </nav>

      <section className="daily-hero" aria-label="Quick actions">
        <Link className="button daily-capture-button" href="/capture">Capture a thought</Link>
        <Link className="secondary-button daily-recall-button" href="/recall">Search memory</Link>
      </section>

      <section className="daily-grid" aria-label="Daily memory overview">
        <article className="daily-panel">
          <div className="daily-panel-header">
            <h2>Recent captures</h2>
            <Link href="/inbox">View all</Link>
          </div>
          {recentCaptures.length > 0 ? (
            <div className="daily-list">
              {recentCaptures.map((item) => (
                <Link className="daily-row" href="/inbox" key={item.id}>
                  <span>{snippet(item.content)}</span>
                  <small>{dateFormatter.format(new Date(item.createdAt))}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">No captures yet.</p>
          )}
        </article>

        <article className="daily-panel">
          <div className="daily-panel-header">
            <h2>Open loops</h2>
            <Link href="/open-loops">Review</Link>
          </div>
          {openLoops.length > 0 ? (
            <div className="daily-list">
              {openLoops.map(({ memory, source }) => (
                <Link className="daily-row" href="/open-loops" key={memory.id}>
                  <span>{memory.content}</span>
                  <small>Source #{source.id}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">No active commitments found.</p>
          )}
        </article>

        <article className="daily-panel">
          <div className="daily-panel-header">
            <h2>Needs review</h2>
            <Link href="/inbox">Open inbox</Link>
          </div>
          {memoriesNeedingReview.length > 0 ? (
            <div className="daily-list">
              {memoriesNeedingReview.map(({ memory, source }) => {
                const confidence = getExtractionConfidence(memory);

                return (
                  <Link className="daily-row" href="/inbox" key={memory.id}>
                    <span>{memory.content}</span>
                    <small>
                      <span className={confidenceBadgeClass(confidence.tone)}>{confidence.label}</span>
                      <span> Source #{source.id}</span>
                    </small>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No memories need review.</p>
          )}
        </article>
      </section>
    </main>
  );
}
