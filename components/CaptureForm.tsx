import { saveCapture } from "@/app/actions";

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
        minLength={1}
        maxLength={10000}
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
