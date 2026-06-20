import Link from "next/link";
import { markResearchLater } from "@/app/research/actions";
import { confidenceBadgeClass, getExtractionConfidence } from "@/lib/confidence";
import {
  listMemoriesNeedingReview,
  listOpenCommitments,
  listRecentMemoriesByKind,
  listRecentSourceItems,
  listResearchQueueItems
} from "@/lib/db";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ researchQueued?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

function snippet(content: string, maxLength = 145): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const [recentCaptures, openLoops, recentIdeas, peopleMentioned, memoriesNeedingReview, researchQueueItems] =
    await Promise.all([
      listRecentSourceItems(6),
      listOpenCommitments(5),
      listRecentMemoriesByKind("idea", 5),
      listRecentMemoriesByKind("person", 6),
      listMemoriesNeedingReview(5),
      listResearchQueueItems(50)
    ]);
  const queuedMemoryIds = new Set(
    researchQueueItems.flatMap(({ researchQueueItem }) =>
      researchQueueItem.memoryId ? [researchQueueItem.memoryId] : []
    )
  );

  return (
    <main className="shell useful-shell">
      <nav className="nav" aria-label="Main navigation">
        <strong>Memory</strong>
        <div className="nav-links">
          <Link className="nav-link" href="/capture">Capture</Link>
          <Link className="nav-link" href="/recall">Recall</Link>
          <Link className="nav-link" href="/inbox">Inbox</Link>
          <Link className="nav-link" href="/open-loops">Open loops</Link>
        </div>
      </nav>

      <section className="useful-header" aria-label="Useful Today">
        <div>
          <h1>Useful Today</h1>
          <p>What you captured, what you might be forgetting, and which ideas deserve attention.</p>
        </div>
        <Link className="button daily-capture-button" href="/capture">Capture a thought</Link>
      </section>

      <section className="recall-panel useful-recall-panel" aria-label="Quick recall">
        <form className="useful-recall-form" action="/recall">
          <input
            className="recall-input"
            name="q"
            placeholder="Search memory: people, ideas, commitments..."
            type="search"
          />
          <button className="button" type="submit">Recall</button>
        </form>
        {params.researchQueued ? <p className="success">Idea marked for research later.</p> : null}
      </section>

      <section className="useful-grid" aria-label="Useful Today sections">
        <article className="daily-panel useful-panel-large">
          <div className="daily-panel-header">
            <h2>Recent captures</h2>
            <Link href="/inbox">View all</Link>
          </div>
          {recentCaptures.length > 0 ? (
            <div className="daily-list">
              {recentCaptures.map((item) => (
                <Link className="daily-row" href="/inbox" key={item.id}>
                  <span>{snippet(item.content)}</span>
                  <small>
                    <span className="badge badge-muted">{item.sourceType}</span>
                    <span>{dateFormatter.format(new Date(item.createdAt))}</span>
                  </small>
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

        <article className="daily-panel useful-panel-large">
          <div className="daily-panel-header">
            <h2>Recent ideas</h2>
            <Link href="/recall?q=ideas">Recall ideas</Link>
          </div>
          {recentIdeas.length > 0 ? (
            <div className="daily-list useful-idea-list">
              {recentIdeas.map(({ memory, source }) => {
                const alreadyQueued = queuedMemoryIds.has(memory.id);

                return (
                  <div className="daily-row useful-idea-row" key={memory.id}>
                    <Link href={`/recall?q=${encodeURIComponent(memory.content)}`}>
                      <span>{memory.content}</span>
                      <small>Source #{source.id}: {snippet(source.content, 88)}</small>
                    </Link>
                    <form action={markResearchLater}>
                      <input name="sourceItemId" type="hidden" value={source.id} />
                      <input name="memoryId" type="hidden" value={memory.id} />
                      <button className="secondary-button" disabled={alreadyQueued} type="submit">
                        {alreadyQueued ? "Queued for research" : "Research later"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No ideas extracted yet.</p>
          )}
        </article>

        <article className="daily-panel">
          <div className="daily-panel-header">
            <h2>People mentioned</h2>
            <Link href="/recall?kind=person&q=people">Recall people</Link>
          </div>
          {peopleMentioned.length > 0 ? (
            <div className="daily-list">
              {peopleMentioned.map(({ memory, source }) => (
                <Link className="daily-row" href={`/recall?kind=person&q=${encodeURIComponent(memory.content)}`} key={memory.id}>
                  <span>{memory.content}</span>
                  <small>Source #{source.id}: {snippet(source.content, 76)}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">No people extracted yet.</p>
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
