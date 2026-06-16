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

## Explainable Memory

Every important graph edge should be explainable:

- What source created this connection?
- Was it directly stated or inferred?
- How confident is the system?
- When was it last updated?
- Can the user edit or delete it?

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
