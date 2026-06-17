import Link from "next/link";
import { recall } from "@/lib/recall";
import { formatRecallResultsHeading, getRecallViewState, parseRecallFilters } from "@/lib/recall-view";

export const dynamic = "force-dynamic";

type RecallPageProps = {
  searchParams: Promise<{ q?: string; kind?: string; status?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

export default async function RecallPage({ searchParams }: RecallPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const filters = parseRecallFilters(params);
  const results = query ? recall(query, 10, undefined, filters.options) : [];
  const viewState = getRecallViewState(query, results.length);

  return (
    <main className="shell">
      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Trusted External Memory</Link>
        <div className="nav-links">
          <Link className="nav-link" href="/capture">Capture</Link>
          <Link className="nav-link" href="/inbox">Inbox</Link>
          <Link className="nav-link" href="/open-loops">Open loops</Link>
        </div>
      </nav>

      <section className="hero">
        <p className="section-label">Source-backed recall</p>
        <h1>Ask what you saved.</h1>
        <p>Search raw captures and proposed memories. Every match shows the source proof.</p>
      </section>

      <section className="recall-panel" aria-label="Recall search">
        <form className="recall-form" action="/recall">
          <input
            className="recall-input"
            defaultValue={query}
            name="q"
            placeholder="Who was the insurance guy?"
            type="search"
          />
          <select aria-label="Memory kind" className="recall-select" defaultValue={filters.selectedKind} name="kind">
            <option value="all">All kinds</option>
            <option value="person">People</option>
            <option value="project">Projects</option>
            <option value="idea">Ideas</option>
            <option value="commitment">Commitments</option>
          </select>
          <select aria-label="Memory status" className="recall-select" defaultValue={filters.selectedStatus} name="status">
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <button className="button" type="submit">Search memory</button>
        </form>
      </section>

      {viewState === "idle" ? (
        <section className="recall-results" aria-label="Recall status">
          <div className="empty-state">No search yet.</div>
        </section>
      ) : null}

      {viewState !== "idle" ? (
        <section className="recall-results" aria-label="Recall results">
          <h2>{formatRecallResultsHeading(query, results.length)}</h2>
          {viewState === "results" ? (
            <div className="inbox">
              {results.map((result) => (
                <article className="capture-item" key={`${result.source.id}-${result.memory?.id ?? "source"}`}>
                  <div className="capture-meta">
                    <span className="badge">{result.memory ? result.memory.kind : "source"}</span>
                    {result.memory ? <span className="badge badge-muted">{result.memory.status}</span> : null}
                    <span>Source #{result.source.id}</span>
                    <span>{dateFormatter.format(new Date(result.source.createdAt))}</span>
                    {result.memory ? <span>{result.memory.confidence}% confidence</span> : null}
                  </div>

                  {result.memory ? (
                    <>
                      <p className="memory-content">{result.memory.content}</p>
                      <p className="memory-rationale">{result.memory.rationale}</p>
                    </>
                  ) : (
                    <p className="memory-content">Raw source match</p>
                  )}

                  <div className="source-proof">
                    <p className="memory-list-title">Source proof</p>
                    <p className="capture-content">{result.sourceSnippet}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No source-backed matches for &ldquo;{query}&rdquo;.</div>
          )}
        </section>
      ) : null}
    </main>
  );
}
