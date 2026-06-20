import type { MemoriesBySourceId, Memory, SourceItem, YouTubeSourcesBySourceId } from "@/lib/db";
import { confidenceBadgeClass, getExtractionConfidence } from "@/lib/confidence";
import { getMemoryReviewState } from "@/lib/memory-review";
import { correctMemoryContent, deleteReviewedMemory, updateReviewedMemory } from "@/app/memories/actions";
import { markResearchLater } from "@/app/research/actions";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

function getExplicitDateTexts(memory: Memory): string[] {
  if (!memory.metadataJson) {
    return [];
  }

  try {
    const metadata = JSON.parse(memory.metadataJson) as {
      explicitDates?: Array<{ text?: unknown; isoDate?: unknown }>;
    };

    return metadata.explicitDates?.flatMap((date) => (typeof date.text === "string" ? [date.text] : [])) ?? [];
  } catch {
    return [];
  }
}

export function CaptureList({
  items,
  memoriesBySource,
  youtubeSourcesBySource = {},
  returnTo = "/inbox"
}: {
  items: SourceItem[];
  memoriesBySource: MemoriesBySourceId;
  youtubeSourcesBySource?: YouTubeSourcesBySourceId;
  returnTo?: "/capture" | "/inbox";
}) {
  if (items.length === 0) {
    return <div className="empty-state">No captures yet. Start by saving one messy thought.</div>;
  }

  return (
    <div className="inbox">
      {items.map((item) => {
        const memories = memoriesBySource[item.id] ?? [];
        const youtubeSource = youtubeSourcesBySource[item.id];

        return (
          <article className="capture-item" key={item.id}>
            <div className="capture-meta">
              <span className="badge">Source #{item.id}</span>
              <span>{item.sourceType}</span>
              <span>{dateFormatter.format(new Date(item.createdAt))}</span>
            </div>
            <p className="capture-content">{item.content}</p>

            {youtubeSource ? (
              <div className="youtube-source-card" aria-label={`YouTube source details for source ${item.id}`}>
                <div className="capture-meta">
                  <span className="badge">YouTube</span>
                  <span className="badge badge-review">
                    {youtubeSource.transcriptStatus === "available" ? "Transcript available" : "Transcript unavailable"}
                  </span>
                  <span>Video ID {youtubeSource.videoId}</span>
                </div>
                <p className="memory-content">{youtubeSource.title ?? "Untitled YouTube video"}</p>
                {youtubeSource.channel ? <p className="memory-rationale">Channel: {youtubeSource.channel}</p> : null}
                <p className="memory-rationale">
                  <a href={youtubeSource.url} rel="noreferrer" target="_blank">{youtubeSource.url}</a>
                </p>
                {youtubeSource.summary ? (
                  <p className="capture-content">{youtubeSource.summary}</p>
                ) : (
                  <p className="memory-rationale">
                    Transcript unavailable. Raw URL and Ty&apos;s captured notes are preserved as personal context.
                  </p>
                )}
                <form action={markResearchLater} className="memory-review-form">
                  <input name="sourceItemId" type="hidden" value={item.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <button className="secondary-button" type="submit">Mark for Research Later</button>
                </form>
              </div>
            ) : null}

            {memories.length > 0 ? (
              <div className="memory-list" aria-label={`Proposed memories for source ${item.id}`}>
                <p className="memory-list-title">Proposed memories</p>
                {memories.map((memory) => {
                  const explicitDates = getExplicitDateTexts(memory);
                  const reviewState = getMemoryReviewState(memory.status);
                  const extractionConfidence = getExtractionConfidence(memory);

                  return (
                    <div className="memory-row" key={memory.id}>
                      <div className="capture-meta">
                        <span className="badge">{memory.kind}</span>
                        <span
                          className={
                            reviewState.statusTone === "review"
                              ? "badge badge-review"
                              : reviewState.statusTone === "muted"
                                ? "badge badge-muted"
                                : "badge"
                          }
                        >
                          {reviewState.statusLabel}
                        </span>
                        <span className={confidenceBadgeClass(extractionConfidence.tone)}>
                          Extraction confidence: {extractionConfidence.label}
                        </span>
                        {explicitDates.length > 0 ? <span>Dates: {explicitDates.join(", ")}</span> : null}
                      </div>
                      <p className="memory-content">{memory.content}</p>
                      <p className="memory-rationale">{memory.rationale}</p>
                      <p className="memory-rationale">{extractionConfidence.explanation}</p>
                      <form className="memory-correction-form" action={correctMemoryContent}>
                        <input name="memoryId" type="hidden" value={memory.id} />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <input
                          aria-label={`Correct ${memory.kind} memory ${memory.id}`}
                          className="memory-correction-input"
                          defaultValue={memory.content}
                          name="content"
                        />
                        <button className="secondary-button" type="submit">Save edit</button>
                      </form>
                      <form className="memory-review-form" action={updateReviewedMemory}>
                        <input name="memoryId" type="hidden" value={memory.id} />
                        <input name="status" type="hidden" value={reviewState.nextAction.status} />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <button className="secondary-button" type="submit">{reviewState.nextAction.label}</button>
                      </form>
                      <form className="memory-review-form" action={deleteReviewedMemory}>
                        <input name="memoryId" type="hidden" value={memory.id} />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <button className="danger-button" type="submit">Delete memory</button>
                      </form>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="memory-list memory-list-empty" aria-label={`No proposed memories for source ${item.id}`}>
                <p className="memory-list-title">No proposed memories</p>
                <p className="memory-rationale">Raw source is preserved and can still appear in recall as a source match.</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
