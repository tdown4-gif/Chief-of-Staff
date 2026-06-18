# Chief of Staff

Internal V1 name: Trusted External Memory.

Anchor problem:

> You generate more value than you can reliably remember.

## Current build scope

This repo is currently building the memory foundation only:

- Capture messy context quickly.
- Preserve each capture as a raw source item.
- Show recent captures in the universal inbox.
- Produce source-backed proposed memories for people, projects, ideas, commitments, and explicit dates.
- Search raw captures and proposed memories from `/recall`.
- Keep the app usable from laptop and iPhone widths as a web-first app/PWA.

Do **not** build Chief of Staff features yet. Travel, gifts, skills, CRM, SBIR tracking, research agents, resume updates, expense tracking, relationship intelligence, calendar management, and dashboards are explicitly deferred.

V1 is an app, but it is not a native iPhone app yet. The target is one responsive Trusted External Memory web app that can run on laptop, open in iPhone Safari, and be saved to the iPhone Home Screen for fast capture. Native iOS/App Store work comes later after the memory loop proves itself.

Important correction for the MVP path: capture is iPhone-first. The web app can remain the dashboard, recall, review, and memory-management surface, but Ty's primary daily capture path should feel native and take under 5 seconds from iPhone.

## App stack

- Next.js
- TypeScript
- SQLite via `better-sqlite3`
- Supabase/Postgres for hosted shared persistence
- Simple CSS

SQLite data is stored at `data/chief-of-staff.db` by default and is ignored by git. You can override the path with `DATABASE_URL=file:/absolute/path/to.db`.

## Deployment environment

Local development uses SQLite by default at `data/chief-of-staff.db`.

For the iPhone-first MVP path, production uses hosted Supabase/Postgres so phone and laptop share one data store. Apply `supabase/schema.sql`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in deployment secrets. The service role key is server-only and must never be exposed to browser code.

iPhone Shortcut capture uses `CAPTURE_API_TOKEN`. Generate a long random token, store it only in deployment secrets and the iOS Shortcut, never log it, and rotate it by replacing the deployment secret and updating the Shortcut `Authorization` header.

## Local setup

```bash
npm install
npm run dev
```

Then open:

- Home: `http://localhost:3000`
- Capture: `http://localhost:3000/capture`
- Inbox: `http://localhost:3000/inbox`
- Recall: `http://localhost:3000/recall`

If port 3000 is already in use, Next.js will print the alternate local URL, such as `http://localhost:3001`.

## Production-style check

```bash
npm test
npm run lint
npm run build
npm run start
```

## Dogfood memory eval

Run the 50-note dogfood check before adding new product areas:

```bash
node scripts/dogfood-memory-eval.mjs
```

It seeds realistic messy notes across people, ideas, commitments, Palms AI, travel context, and random thoughts, then checks the V1 questions from `vision/mvp.md` for misses and false positives.

For a harder diagnostic, run the Ty Chaos Dataset:

```bash
node scripts/ty-chaos-memory-eval.mjs
```

It seeds 100 deliberately messy notes and reports misses, false positives, ambiguous retrievals, missing context, and weak confidence scores. This report is expected to find problems.

After tuning against the chaos dataset, run the fresh holdout check:

```bash
node scripts/holdout-memory-eval.mjs
```

It seeds 20 notes and 5 queries that should not be used while tuning recall.

## First manual test

1. Open `/capture` on laptop or phone.
2. Paste a messy thought, for example:
   `Need to follow up with Sarah about pricing after the demo.`
3. Save it.
4. Confirm `/inbox` shows the raw source item with timestamp.
5. Confirm the source item shows a proposed commitment memory with confidence and rationale.
6. Open `/recall`, search for `pricing`, and confirm the result includes source proof.

## Extraction v0

There is no LLM key required by default. Extraction uses a small `MemoryExtractor` interface with a deterministic fallback in `lib/extraction.ts`.

Optional model-backed extraction is available through an OpenAI-compatible provider hook:

```bash
MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.1-mini
```

If no provider is configured, or if the provider call fails, capture still works and falls back to deterministic extraction.

The fallback extracts only:

- People
- Projects
- Ideas
- Commitments
- Explicit dates as metadata on proposed memories

Every stored memory points back to `source_items.id`, includes confidence, and preserves a rationale. Extraction errors are isolated so a failed extraction does not break raw capture.

## Recall v0

Recall is deliberately keyword-based for now. `/recall` searches recent raw captures and proposed memories, then returns matching memories or raw source matches with source snippets.

V0 recall does not use embeddings, web research, proactive suggestions, chat history, or calendar/task workflows. It is only meant to prove that captured context can be recovered with provenance.

## Start here

- [Agent guidance](AGENTS.md)
- [Product vision](vision/product_vision.md)
- [MVP](vision/mvp.md)
- [Hermes build brief](docs/hermes_build_brief.md)
- [Operating model](docs/operating_model.md)
