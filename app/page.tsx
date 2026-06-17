import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav" aria-label="Main navigation">
        <strong>Trusted External Memory</strong>
        <div className="nav-links">
          <Link className="nav-link" href="/capture">Capture</Link>
          <Link className="nav-link" href="/inbox">Inbox</Link>
          <Link className="nav-link" href="/recall">Recall</Link>
        </div>
      </nav>

      <section className="hero">
        <p className="section-label">Trusted External Memory v0</p>
        <h1>One inbox for messy context.</h1>
        <p>
          Chief of Staff is not being built yet. This version only proves the memory foundation:
          capture raw thoughts quickly, preserve the source, and make recent context visible.
        </p>
        <div className="nav-links">
          <Link className="button" href="/capture">Capture a thought</Link>
          <Link className="secondary-button" href="/recall">Search memory</Link>
        </div>
      </section>

      <section className="grid" aria-label="V0 scope">
        <div className="card">
          <h2>Capture</h2>
          <p>Fast text capture from laptop or phone with no folders, tags, or organization decisions.</p>
        </div>
        <div className="card">
          <h2>Recall</h2>
          <p>Search proposed memories and raw captures with source snippets attached to every result.</p>
        </div>
        <div className="card">
          <h2>Defer</h2>
          <p>No travel, gifts, CRM, dashboards, calendar management, or proactive research in v0.</p>
        </div>
      </section>
    </main>
  );
}
