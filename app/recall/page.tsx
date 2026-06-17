import Link from "next/link";
import { saveRecallFeedback } from "@/app/recall/actions";
import { confidenceBadgeClass, getExtractionConfidence, getRecallConfidence } from "@/lib/confidence";
import { recall } from "@/lib/recall";
import { formatRecallResultsHeading, getRecallViewState, parseRecallFilters } from "@/lib/recall-view";

export const dynamic = "force-dynamic";

type RecallPageProps = {
  searchParams: Promise<{ q?: string; kind?: string; status?: string; sourceType?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

const resultTypeLabels = {
  memory: "confirmed memory",
  needs_review: "needs review",
  raw: "raw source match",
  raw_fallback: "raw fallback"
} as const;

export default async function RecallPage({ searchParams }: RecallPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const filters = parseRecallFilters(params);
  const results = query ? await recall(query, 10, undefined, filters.options) : [];
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
            <option value="needs_review">Needs review</option>
            <option value="done">Done</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            aria-label="Source type"
            className="recall-select"
            defaultValue={filters.selectedSourceType}
            name="sourceType"
          >
            <option value="all">All sources</option>
            <option value="text">Text</option>
            <option value="note">Notes</option>
            <option value="link">Links</option>
            <option value="document">Documents</option>
            <option value="contact">Contacts</option>
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
              {results.map((result) => {
                const recallConfidence = getRecallConfidence(result);
                const extractionConfidence = result.memory ? getExtractionConfidence(result.memory) : null;

                return (
                  <article className="capture-item" key={`${result.source.id}-${result.memory?.id ?? "source"}`}>
                    <div className="capture-meta">
                      <span className="badge">{result.memory ? result.memory.kind : "source"}</span>
                      {result.memory ? <span className="badge badge-muted">{result.memory.status}</span> : null}
                      <span
                        className={
                          result.resultType === "needs_review" || result.resultType === "raw_fallback"
                            ? "badge badge-review"
                            : "badge badge-muted"
                        }
                      >
                        {resultTypeLabels[result.resultType]}
                      </span>
                      <span className={confidenceBadgeClass(recallConfidence.tone)}>
                        Retrieval confidence: {recallConfidence.label}
                      </span>
                      {extractionConfidence ? (
                        <span className={confidenceBadgeClass(extractionConfidence.tone)}>
                          Extraction confidence: {extractionConfidence.label}
                        </span>
                      ) : null}
                      <span className="badge badge-muted">{result.source.sourceType}</span>
                      <span>Source #{result.source.id}</span>
                      <span>{dateFormatter.format(new Date(result.source.createdAt))}</span>
                    </div>

                    {result.memory ? (
                      <>
                        <p className="memory-content">{result.memory.content}</p>
                        <p className="memory-rationale">{result.memory.rationale}</p>
                        {extractionConfidence ? <p className="memory-rationale">{extractionConfidence.explanation}</p> : null}
                      </>
                    ) : (
                      <p className="memory-content">Raw source match</p>
                    )}
                    <p className="memory-rationale">{recallConfidence.explanation}</p>

                    <div className="source-proof">
                      <p className="memory-list-title">Source proof</p>
                      <p className="capture-content">{result.sourceSnippet}</p>
                    </div>

                    <div className="recall-feedback-actions" aria-label={`Recall feedback for source ${result.source.id}`}>
                      {[
                        ["not_relevant", "Not relevant"],
                        ["promote_to_memory", "Promote to memory"],
                        ["add_context", "Add context"]
                      ].map(([action, label]) => (
                        <form action={saveRecallFeedback} key={action}>
                          <input name="query" type="hidden" value={query} />
                          <input name="action" type="hidden" value={action} />
                          <input name="sourceItemId" type="hidden" value={result.source.id} />
                          {result.memory ? <input name="memoryId" type="hidden" value={result.memory.id} /> : null}
                          <button className="secondary-button" type="submit">{label}</button>
                        </form>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No source-backed matches for &ldquo;{query}&rdquo;.</div>
          )}
        </section>
      ) : null}
    </main>
  );
}
