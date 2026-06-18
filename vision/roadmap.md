# Roadmap

## Phase 1: Foundation

- Define core object schema.
- Build universal inbox.
- Add manual text capture.
- Add document text capture.
- Implement AI classification and extraction.
- Store source-backed memories.
- Build basic search.

## Phase 2: Memory Graph

- Link people, companies, ideas, projects, tasks, events, documents, skills, opportunities, trips, preferences, and subscriptions.
- Add confidence scores to extracted memories.
- Show memory explanations and source references.
- Add merge, edit, archive, and delete controls.
- Build object detail pages.

## Phase 2.5: Research Queue

Research is an optional workflow on top of memory, not an autonomous research system.

- Let a source item or memory create one or more ResearchQueueItems.
- Keep memory status focused on trust and lifecycle: active, needs_review, done, dismissed.
- Treat research intent as separate from whether something should be remembered.
- Link every research request back to the source item, memory, or both that created it.
- Store future research outputs back into memory with a link to the original source or memory.

Future output types:

- Competitor analysis
- Market research
- Related ideas
- User complaints
- Suggested next actions

Phase 2.5 guardrails:

- Do not build autonomous agents.
- Do not build continuous research.
- Do not build scheduled research.
- Do not build web crawling.
- Do not let research outputs bypass source-backed memory review.

## Phase 3: Proactive Chief Of Staff

- Suggest tasks from notes, meetings, and documents.
- Detect stalled projects.
- Identify follow-up opportunities.
- Recommend research prompts from explicit ResearchQueueItems.
- Summarize recent activity.
- Ask clarification questions when memory is ambiguous.

## Phase 4: Research Layer

- Research companies, competitors, grants, SBIR opportunities, and market signals from user-approved research queue items.
- Connect research findings to projects and opportunities.
- Track open questions.
- Produce briefings and decision memos.

## Phase 5: Compounding Intelligence

- Learn durable preferences.
- Build skills graph.
- Detect opportunities from accumulated context.
- Generate project plans from ideas.
- Suggest resume updates.
- Add relationship intelligence.
- Add travel preference learning and gift reminders.

## V1 Refusal List

- Full CRM
- Full calendar app
- Travel booking
- Password manager
- Expense management suite
- Enterprise collaboration
- Browser extension
- Native mobile app
- Complex dashboards
