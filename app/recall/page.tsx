import Link from "next/link";
import { recall } from "@/lib/recall";

export const dynamic = "force-dynamic";

type RecallPageProps = {
  searchParams: Promise<{ q?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

export default async function RecallPage({ searchParams }: RecallPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? recall(query) : [];

  return (
    <main className="shell">
      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Trusted External Memory</Link>
        <div className="nav-links">
          <Link className="nav-link" href="/capture">Capture</Link>
          <Link className="nav-link" href="/inbox">Inbox</Link>
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
          <button className="button" type="submit">Search memory</button>
        </form>
      </section>

      {query ? (
        <section className="recall-results" aria-label="Recall results">
          <h2>Results for &ldquo;{query}&rdquo;</h2>
          {results.length > 0 ? (
            <div className="inbox">
              {results.map((result) => (
                <article className="capture-item" key={`${result.source.id}-${result.memory?.id ?? "source"}`}>
                  <div className="capture-meta">
                    <span className="badge">{result.memory ? result.memory.kind : "source"}</span>
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
            <div className="empty-state">No source-backed matches yet.</div>
          )}
        </section>
      ) : null}
    </main>
  );
}
