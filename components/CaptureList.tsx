import type { SourceItem } from "@/lib/db";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function CaptureList({ items }: { items: SourceItem[] }) {
  if (items.length === 0) {
    return <div className="empty-state">No captures yet. Start by saving one messy thought.</div>;
  }

  return (
    <div className="inbox">
      {items.map((item) => (
        <article className="capture-item" key={item.id}>
          <div className="capture-meta">
            <span className="badge">Source #{item.id}</span>
            <span>{item.sourceType}</span>
            <span>{dateFormatter.format(new Date(item.createdAt))}</span>
          </div>
          <p className="capture-content">{item.content}</p>
        </article>
      ))}
    </div>
  );
}
