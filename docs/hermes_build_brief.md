# Hermes Build Brief

## Mission

Build Trusted External Memory v0.

Do not build Chief of Staff yet.

Do not build the future vision.

Build the smallest useful system where Ty can capture messy context from laptop or phone and later retrieve it with source-backed answers.

Anchor problem:

> You generate more value than you can reliably remember.

## Product Goal

Ty should be able to dump thoughts, people, ideas, commitments, and project context into one inbox without organizing anything manually.

Later, Ty should be able to ask:

- Who was that insurance guy I met?
- What were my AI business ideas from March?
- What commitments have I made recently?
- What am I forgetting?
- What were the insurance AI ideas I mentioned more than once?

The system should answer with source-backed recall.

## Build Goal 1: Scaffold The App

Create a small web app that can run locally and on a VPS.

Recommended stack unless there is a strong reason to choose otherwise:

- Next.js
- TypeScript
- SQLite for the first local/VPS version
- Drizzle or Prisma if useful, but keep it light
- Tailwind or simple CSS

Done means:

- App starts from documented commands.
- README includes setup and run instructions.
- There is a working home page.
- There is a working capture page.
- The UI works on laptop and phone widths.

## Build Goal 2: Universal Inbox

Build the capture path.

Required:

- Text capture.
- Mobile-friendly capture route.
- Save raw input as a source item.
- Timestamp each capture.
- List recent captures.

Nice but optional:

- PWA manifest so Ty can save the capture page to iPhone home screen.
- Dedicated `/capture` route optimized for phone.

Done means:

- Ty can open `/capture` from phone or laptop, type an idea, save it, and see it in the inbox.
- No folders.
- No tags.
- No required organization decisions.

## Build Goal 3: Memory Data Model

Implement the smallest useful memory schema.

Required objects:

- Source
- Memory
- Person
- Project
- Idea
- Commitment

Do not implement:

- Trips
- Gifts
- Skills graph
- Resume updates
- SBIR tracking
- Subscriptions
- CRM workflows
- Calendar workflows
- Proactive research

Done means:

- Raw captures are preserved.
- Extracted memory can point back to source.
- Memories can store confidence.
- Basic object types can be represented without overbuilding separate modules.

## Build Goal 4: Extraction Pipeline

Add the first extraction pass.

If an LLM key is available, use structured JSON extraction.

If no key is available, create a clean stub interface and deterministic fallback so the app still runs.

Extract:

- People
- Projects
- Ideas
- Commitments
- Important dates if explicit

Every extracted item needs:

- Source reference
- Confidence
- Extracted text or rationale

Done means:

- A capture can produce proposed memories.
- The app never treats extracted memory as source truth without provenance.
- Failed extraction does not break capture.

## Build Goal 5: Recall

Build retrieval before building proactive features.

Required:

- Search captures and memories.
- Ask simple natural-language questions.
- Return matching memories with source snippets.

Optional if time allows:

- Embeddings.
- Hybrid keyword + semantic search.

Done means:

- The app can answer simple recall questions from stored context.
- Answers show source proof.
- Retrieval is useful enough to test with 50-100 real messy notes.

## Build Goal 6: Open Loops, Only If Recall Works

After capture and recall work, add a basic open-loops view.

Required:

- List extracted commitments.
- Show source.
- Show confidence.
- Allow mark done or dismiss.

Do not build full task management.

Done means:

- Ty can see likely commitments without managing a task system.
- The feature feels like memory recall, not a to-do app.

## Hard Guardrails

- Do not build travel planning.
- Do not build gift reminders.
- Do not build resume updates.
- Do not build skills graph.
- Do not build SBIR tracking.
- Do not build CRM.
- Do not build calendar management.
- Do not build proactive research.
- Do not build multi-agent orchestration.
- Do not build a complex dashboard.

If tempted, write the idea down as future work and return to capture and recall.

## First Test Dataset

Seed with sample captures like:

- Met Mike. Insurance agency owner. Interested in AI workflows for renewals and customer follow-up.
- Idea: AI tool for insurance agencies that remembers client renewal dates and suggests outreach.
- Need to follow up with Sarah about pricing after the demo.
- Palms AI idea: turn messy founder notes into structured venture briefs.
- Thinking about New Zealand next July. Prefer Delta if possible.

The system should later answer:

- Who was the insurance guy?
- What insurance AI ideas have I mentioned?
- What follow-ups do I owe?
- What travel idea did I mention?

## Commit Discipline

Commit and push after each build goal.

Use clear commit messages:

- `Scaffold Trusted External Memory app`
- `Add universal inbox capture`
- `Add source-backed memory schema`
- `Add extraction pipeline`
- `Add source-backed recall`
- `Add basic open loops view`

Keep the project pick-up-able from anywhere.
