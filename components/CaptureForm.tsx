import { saveCapture } from "@/app/actions";
import { MAX_CAPTURE_CHARACTERS } from "@/lib/capture";

export function CaptureForm({ error, captured }: { error?: string; captured?: boolean }) {
  return (
    <form action={saveCapture} className="capture-card">
      <label className="capture-label" htmlFor="content">Capture</label>
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
        placeholder="Type or paste anything worth remembering..."
      />
      {captured ? <p className="success">Saved. Ready for the next thought.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="capture-actions">
        <p className="hint">No folders. No tags. Just capture.</p>
        <button className="button capture-save-button" type="submit">Save</button>
      </div>
    </form>
  );
}
