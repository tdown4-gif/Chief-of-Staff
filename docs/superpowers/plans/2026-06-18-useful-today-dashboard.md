# Useful Today Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page immediately useful by showing captured thoughts, open loops, recent ideas, people, review items, quick recall, and a Research later action for ideas.

**Architecture:** Keep `/` as the single Useful Today dashboard. Add small DB helper APIs for recent idea/person memories and research queue items, then use a server action to mark an idea for later research. Research Queue stores intent only; it does not run agents, schedules, crawling, or research generation.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, TypeScript, SQLite/local adapter, Supabase adapter, libSQL adapter, node:test.

---

## File Structure

- Modify `lib/db-types.ts`: add ResearchQueueItem types and adapter methods.
- Modify `lib/db-local.ts`: add `research_queue_items` table, create/list helpers, and recent memory helpers.
- Modify `lib/db.ts`: expose new adapter methods.
- Modify `lib/db-libsql.ts` and `lib/db-supabase.ts`: implement matching persistence methods.
- Create `app/research/actions.ts`: server action for Research later.
- Modify `app/page.tsx`: replace current home with Useful Today dashboard.
- Modify `app/globals.css`: add dashboard/search/research action styling.
- Add tests in `tests/useful-today.test.mjs` and `tests/research-queue.test.mjs`.
- Update `supabase/schema.sql`: document production table shape.

## Tasks

### Task 1: Recent Idea/Person Helpers

- [ ] Write failing tests that seed source items and memories, then assert `listRecentMemoriesByKind("idea")` and `listRecentMemoriesByKind("person")` return active memories with source proof.
- [ ] Run `node --test tests/useful-today.test.mjs` and confirm the helpers are missing.
- [ ] Add `listRecentMemoriesByKind(kind, limit)` to the DB interface and local/libsql/supabase adapters.
- [ ] Run the focused test and confirm it passes.

### Task 2: Research Queue Persistence

- [ ] Write failing tests for `createResearchQueueItem({ sourceItemId, memoryId })` and `listResearchQueueItems()`.
- [ ] Run `node --test tests/research-queue.test.mjs` and confirm the feature is missing.
- [ ] Add `research_queue_items` with source/memory foreign keys, `status`, and `created_at`.
- [ ] Implement adapter methods and facade exports.
- [ ] Run the focused test and confirm it passes.

### Task 3: Research Later Action

- [ ] Write failing test or integration coverage around the DB behavior used by the action.
- [ ] Create `app/research/actions.ts` to validate `memoryId` and `sourceItemId`, create the queue item, revalidate `/`, and redirect to `/?researchQueued=1`.
- [ ] Run focused tests.

### Task 4: Useful Today Home Page

- [ ] Update `/` to show quick recall, recent captures, open loops, recent ideas with Research later buttons, people mentioned, and needs review.
- [ ] Keep this as a compact dashboard, not a complex analytics surface.
- [ ] Add CSS for the Useful Today layout.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.

### Task 5: Deployable PR State

- [ ] Check `git diff --check`.
- [ ] Commit with a concise message.
- [ ] Push branch/main if requested.
