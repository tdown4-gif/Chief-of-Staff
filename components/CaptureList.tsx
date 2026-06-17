import type { MemoriesBySourceId, Memory, SourceItem } from "@/lib/db";
import { getMemoryReviewState } from "@/lib/memory-review";
import { correctMemoryContent, updateReviewedMemory } from "@/app/memories/actions";

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
  returnTo = "/inbox"
}: {
  items: SourceItem[];
  memoriesBySource: MemoriesBySourceId;
  returnTo?: "/capture" | "/inbox";
}) {
  if (items.length === 0) {
    return <div className="empty-state">No captures yet. Start by saving one messy thought.</div>;
  }

  return (
    <div className="inbox">
      {items.map((item) => {
        const memories = memoriesBySource[item.id] ?? [];

        return (
          <article className="capture-item" key={item.id}>
            <div className="capture-meta">
              <span className="badge">Source #{item.id}</span>
              <span>{item.sourceType}</span>
              <span>{dateFormatter.format(new Date(item.createdAt))}</span>
            </div>
            <p className="capture-content">{item.content}</p>

            {memories.length > 0 ? (
              <div className="memory-list" aria-label={`Proposed memories for source ${item.id}`}>
                <p className="memory-list-title">Proposed memories</p>
                {memories.map((memory) => {
                  const explicitDates = getExplicitDateTexts(memory);
                  const reviewState = getMemoryReviewState(memory.status);

                  return (
                    <div className="memory-row" key={memory.id}>
                      <div className="capture-meta">
                        <span className="badge">{memory.kind}</span>
                        <span className={reviewState.statusTone === "muted" ? "badge badge-muted" : "badge"}>
                          {reviewState.statusLabel}
                        </span>
                        <span>{memory.confidence}% confidence</span>
                        {explicitDates.length > 0 ? <span>Dates: {explicitDates.join(", ")}</span> : null}
                      </div>
                      <p className="memory-content">{memory.content}</p>
                      <p className="memory-rationale">{memory.rationale}</p>
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
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
