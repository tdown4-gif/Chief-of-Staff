# Memory Graph

## Purpose

The memory graph connects captured information to durable context. It should help Chief of Staff remember people, companies, ideas, projects, tasks, events, documents, skills, opportunities, trips, preferences, and subscriptions over time.

## Nodes

Primary node types:

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
- Memories
- Capture items
- Suggestions
- Research queue items
- Research outputs

## Edges

Example edge types:

- person_works_at_company
- person_related_to_project
- company_related_to_opportunity
- idea_seeded_project
- project_has_task
- event_mentions_person
- document_supports_memory
- preference_applies_to_trip
- skill_supports_opportunity
- subscription_related_to_company
- memory_derived_from_capture
- suggestion_based_on_memory
- research_queue_item_created_from_source
- research_queue_item_created_from_memory
- research_output_based_on_research_queue_item
- research_output_stored_as_memory

## Explainable Memory

Every important graph edge should be explainable:

- What source created this connection?
- Was it directly stated or inferred?
- How confident is the system?
- When was it last updated?
- Can the user edit or delete it?

## Memory Lifecycle

Not all information should be treated equally. The system should eventually support multiple memory layers so durable facts, currently useful context, and short-lived information do not compete as if they have the same value.

### Permanent Memory

Rarely changes and should be retained indefinitely.

Examples:

- Family members
- Core relationships
- Skills
- Certifications
- Travel preferences
- Career history
- Long-term projects
- User preferences

### Active Memory

Currently relevant and frequently surfaced.

Examples:

- Current projects
- Open opportunities
- Active research
- Upcoming trips
- Current goals
- Follow-ups

### Temporary Memory

Useful for a limited period and should naturally fade.

Examples:

- One-off meeting notes
- Temporary reminders
- Time-sensitive research
- Short-lived ideas
- Administrative details

## Lifecycle Signals

The system should eventually evaluate:

- How often information is referenced.
- Whether information leads to actions.
- Whether information is connected to active projects.
- Whether information has become stale.

The goal is to prevent the memory system from becoming a giant junk drawer.

Future research question:

Should memory decay automatically, require user confirmation, or simply lower retrieval priority over time?

Do not build this in V1. Design the data model so memory lifecycle states can be added later.

## Time And Decay

Memory should be persistent, but not static. The graph should track freshness and usage:

- Recently confirmed memories should rank higher.
- Stale memories should be surfaced carefully.
- Conflicting memories should trigger clarification.
- Old preferences should not silently override new behavior.

## V1 Graph Behavior

V1 should support:

- Object extraction.
- Relationship creation.
- Source-backed explanations.
- Manual correction.
- Basic graph traversal for retrieval.
- Suggestions based on related objects.

V1 does not need complex graph visualization or dashboards.

## Phase 2.5 Research Queue

Research is an optional workflow on top of memory.

ResearchQueueItem should be modeled as its own graph node, not as a memory status. Memory status should remain about trust and lifecycle: active, needs_review, done, dismissed.

Allowed relationships:

- A source item can create one or more ResearchQueueItems.
- A memory can create one or more ResearchQueueItems.
- A ResearchQueueItem can later produce one or more research outputs.
- Each research output should be stored back into memory and linked to the original source or memory.

Future research output types:

- Competitor analysis
- Market research
- Related ideas
- User complaints
- Suggested next actions

Guardrails:

- Do not build autonomous agents.
- Do not build continuous research.
- Do not build scheduled research.
- Do not build web crawling.
- Do not create research outputs that are disconnected from source-backed memory.
