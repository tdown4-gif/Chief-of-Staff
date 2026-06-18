# Data Model

## Overview

The data model should support capture, AI organization, persistent memory, source-backed explanations, and proactive suggestions.

## Core Entities

### CaptureItem

Raw input from the universal inbox.

Fields:

- id
- user_id
- source_type
- raw_content
- captured_at
- processing_status
- privacy_level

### Memory

A durable fact, preference, summary, or learned context derived from one or more captured items.

Fields:

- id
- user_id
- memory_type
- statement
- confidence
- created_at
- updated_at
- last_used_at
- source_ids
- explanation

Future lifecycle-ready fields:

- lifecycle_state
- first_observed_at
- last_referenced_at
- reference_count
- action_count
- stale_after
- related_active_object_ids
- retrieval_priority

The V1 schema does not need to implement memory decay, but it should avoid choices that make lifecycle states hard to add later.

Potential lifecycle states:

- permanent
- active
- temporary
- archived
- dismissed

Confidence should be represented as a 0-100 score so the system can separate strong extractions from weak inferences.

Example:

User capture: "Thinking about New Zealand next July"

- Trip: New Zealand next July, confidence 95
- Preferred airline: Delta, confidence 62
- Travel goal: Vacation, confidence 40

### Object

Structured entity extracted from memory and capture.

Object types:

- People
- Companies
- Ideas
- Projects
- Tasks
- Events
- Documents
- Skills
- Opportunities
- Trips
- Preferences
- Subscriptions

Fields:

- id
- user_id
- object_type
- name
- description
- status
- properties
- created_at
- updated_at

### Relationship

Typed edge between objects or memories.

Fields:

- id
- user_id
- from_id
- to_id
- relationship_type
- confidence
- source_ids
- created_at
- updated_at

### Suggestion

AI-generated recommendation that requires user control.

Fields:

- id
- user_id
- suggestion_type
- title
- rationale
- related_object_ids
- related_memory_ids
- status
- created_at
- resolved_at

### ResearchQueueItem

An explicit request to research a source item or memory later.

ResearchQueueItem is separate from Memory status. Memory status should remain about trust and lifecycle:

- active
- needs_review
- done
- dismissed

Research intent is a workflow layered on top of memory. A source item or memory can be remembered without research, and it can spawn one or more research requests later.

Fields:

- id
- user_id
- source_item_id
- memory_id
- research_prompt
- requested_output_type
- status
- created_at
- updated_at
- completed_at

`source_item_id` and `memory_id` should be nullable only to support different entry points, but every ResearchQueueItem must link to at least one original source item or memory.

Future requested output types:

- competitor_analysis
- market_research
- related_ideas
- user_complaints
- suggested_next_actions

Future research outputs should be stored back into the memory layer, not in an isolated research silo. Each output should preserve:

- the ResearchQueueItem that requested it
- the original source item or memory that motivated it
- the generated research content
- source proof or rationale
- confidence or review status

This keeps research explainable and makes research findings retrievable through the same source-backed memory system.

## Design Principles

- Every memory should be explainable.
- Every AI-created object should trace back to source material.
- User actions should be explicit for changes that affect outside systems.
- Privacy level should travel with memories and objects.
- The graph should tolerate uncertainty, merging, and correction.
- Not all information should be treated equally.
- The memory system should not become a giant junk drawer.
- Research intent should not overload memory status.
- Research outputs should compound memory instead of creating a parallel knowledge base.

## V1 Storage Shape

V1 can use relational tables for core entities and relationship edges, with embeddings for semantic retrieval. The product should not require a specialized graph database before proving the memory behavior.

Do not build full memory lifecycle behavior in V1. Design for it by keeping confidence, timestamps, source references, related objects, and future lifecycle fields available.

## Implemented v0 Schema

The current app intentionally implements the smallest source-backed memory shape:

### source_items

Raw captures from the universal inbox.

- `id`
- `content`
- `source_type`
- `created_at`

`content` is preserved verbatim. Validation rejects whitespace-only captures, but does not trim stored source text.

### memories

Extracted memory records that point back to raw source.

- `id`
- `source_item_id`
- `kind`
- `content`
- `confidence`
- `rationale`
- `metadata_json`
- `status`
- `created_at`

Allowed `kind` values are:

- `person`
- `project`
- `idea`
- `commitment`

This deliberately avoids separate person, project, idea, and commitment modules for v0. Those object types are represented by `memories.kind` until extraction and recall prove that more structure is needed.

`status` is intentionally minimal:

- `active`
- `done`
- `dismissed`

It currently supports the basic open-loops view for commitment memories only. This is not a full memory lifecycle, task system, or workflow engine.

`done` means Ty believes a real commitment has been handled. `dismissed` means the proposed commitment should no longer appear in open loops, often because the extraction was noise or not useful.

Explicitly deferred from open loops v0:

- due dates
- snooze or reminders
- priority or manual sorting
- notifications

### extraction v0

The current extraction pipeline is intentionally small:

- `MemoryExtractor` defines the provider interface.
- `deterministicFallbackExtractor` runs when no LLM integration is configured.
- `extractAndStoreMemoriesForSource` stores proposed memories for a source item and returns an error instead of throwing through capture.

The fallback only proposes:

- people
- projects
- ideas
- commitments

Explicit dates are stored inside `memories.metadata_json` as supporting metadata, not as a separate memory kind. This keeps V0 anchored to source-backed memory without introducing date, event, trip, task-management, CRM, or calendar modules.

### recall v0

The current recall layer does not add new tables. It performs bounded keyword retrieval over recent `source_items` and their proposed `memories`.

Recall results include:

- the matching memory, when one exists
- the raw source item
- a source snippet
- a simple match score used only for ordering

This is intentionally not a chat system, task system, dashboard, semantic search service, or proactive recommendation layer. The only purpose is to prove that Ty can recover captured context with visible source proof.

### open loops v0

The current open-loops layer does not add a task table. It lists active `commitment` memories with source proof and confidence, then lets Ty mark a commitment `done` or `dismissed` by updating `memories.status`.

This keeps open loops tied to source-backed memory instead of becoming task management.

### research queue future shape

ResearchQueueItem is documented for Phase 2.5 only. It is not part of the implemented v0 schema.

Do not implement research agents, scheduled research, continuous research, or web crawling yet. The first useful version should only model the queue relationship:

- a source item can create research requests
- a memory can create research requests
- a research request can later produce one or more source-backed memory outputs

The memory layer remains the foundation.
