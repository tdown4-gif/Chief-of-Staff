import Link from "next/link";
import { confidenceBadgeClass, getExtractionConfidence } from "@/lib/confidence";
import { listOpenCommitments } from "@/lib/db";
import { dismissOpenLoop, markOpenLoopDone } from "./actions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

function buildSourceSnippet(sourceContent: string, maxLength = 240): string {
  const normalized = sourceContent.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

export default function OpenLoopsPage() {
  const loops = listOpenCommitments(50);

  return (
    <main className="shell">
      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Trusted External Memory</Link>
        <div className="nav-links">
          <Link className="nav-link" href="/capture">Capture</Link>
          <Link className="nav-link" href="/inbox">Inbox</Link>
          <Link className="nav-link" href="/recall">Recall</Link>
        </div>
      </nav>

      <section className="hero">
        <p className="section-label">Open loops</p>
        <h1>Likely commitments.</h1>
        <p>Extracted commitments with source proof. Mark one done or dismiss it without turning memory into a task app.</p>
      </section>

      <section className="recall-results" aria-label="Open commitments">
        {loops.length > 0 ? (
          <div className="inbox">
            {loops.map(({ memory, source }) => {
              const extractionConfidence = getExtractionConfidence(memory);

              return (
                <article className="capture-item" key={memory.id}>
                  <div className="capture-meta">
                    <span className="badge">commitment</span>
                    <span className={confidenceBadgeClass(extractionConfidence.tone)}>
                      Extraction confidence: {extractionConfidence.label}
                    </span>
                    <span>Source #{source.id}</span>
                    <span>{dateFormatter.format(new Date(source.createdAt))}</span>
                  </div>

                  <p className="memory-content">{memory.content}</p>
                  <p className="memory-rationale">{memory.rationale}</p>
                  <p className="memory-rationale">{extractionConfidence.explanation}</p>

                  <div className="source-proof">
                    <p className="memory-list-title">Source proof</p>
                    <p className="capture-content">{buildSourceSnippet(source.content)}</p>
                  </div>

                  <div className="open-loop-actions" aria-label={`Actions for commitment ${memory.id}`}>
                    <form action={markOpenLoopDone}>
                      <input name="memoryId" type="hidden" value={memory.id} />
                      <button className="button" type="submit">Mark done</button>
                    </form>
                    <form action={dismissOpenLoop}>
                      <input name="memoryId" type="hidden" value={memory.id} />
                      <button className="secondary-button" type="submit">Dismiss</button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No open commitments found in proposed memories.</div>
        )}
      </section>
    </main>
  );
}
