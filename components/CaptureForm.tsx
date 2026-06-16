import { saveCapture } from "@/app/actions";
import { MAX_CAPTURE_CHARACTERS } from "@/lib/capture";

export function CaptureForm({ error }: { error?: string }) {
  return (
    <form action={saveCapture} className="capture-card">
      <label htmlFor="content">
        <strong>Messy thought, note, person, idea, or commitment</strong>
      </label>
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
        placeholder="Example: Need to follow up with Sarah about pricing after the demo. Also had an idea for insurance agencies: remember renewal dates and suggest outreach."
      />
      {error ? <p className="error">{error}</p> : null}
      <div className="capture-actions">
        <p className="hint">No folders. No tags. Raw source preserved.</p>
        <button className="button" type="submit">Save to inbox</button>
      </div>
    </form>
  );
}
