import { saveCapture } from "@/app/actions";
import { MAX_CAPTURE_CHARACTERS, SOURCE_TYPES } from "@/lib/capture";

const sourceTypeLabels: Record<(typeof SOURCE_TYPES)[number], string> = {
  text: "Text",
  note: "Note",
  link: "Link",
  document: "Document",
  contact: "Contact",
  youtube: "YouTube"
};

export function CaptureForm({ error, captured }: { error?: string; captured?: boolean }) {
  return (
    <form action={saveCapture} className="capture-card">
      <div className="capture-card-header">
        <div>
          <label className="capture-label" htmlFor="content">Capture</label>
          <p className="capture-prompt">Drop the raw thought here. Clean it up later, if it matters.</p>
        </div>
        <label className="source-type-field">
          <span>Source</span>
          <select className="capture-select" name="sourceType" defaultValue="text">
            {SOURCE_TYPES.map((sourceType) => (
              <option key={sourceType} value={sourceType}>{sourceTypeLabels[sourceType]}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        id="content"
        name="content"
        className="capture-textarea"
        autoFocus
        required
        rows={8}
        minLength={1}
        maxLength={MAX_CAPTURE_CHARACTERS}
        spellCheck
        placeholder="Type, paste, or dictate anything worth remembering..."
      />
      <label className="context-field" htmlFor="youtubeContext">
        <span>Why I saved this</span>
        <textarea
          id="youtubeContext"
          name="youtubeContext"
          className="context-textarea"
          rows={3}
          spellCheck
          placeholder="Optional context for a YouTube link or idea..."
        />
      </label>
      <div className="capture-status" aria-live="polite">
        {captured ? <p className="success">Saved. Ready for the next thought.</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
      <div className="capture-actions">
        <p className="hint">No folders. No tags. Just capture.</p>
        <button className="button capture-save-button" type="submit">Save</button>
      </div>
    </form>
  );
}
