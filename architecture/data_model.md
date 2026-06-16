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

## Design Principles

- Every memory should be explainable.
- Every AI-created object should trace back to source material.
- User actions should be explicit for changes that affect outside systems.
- Privacy level should travel with memories and objects.
- The graph should tolerate uncertainty, merging, and correction.
- Not all information should be treated equally.
- The memory system should not become a giant junk drawer.

## V1 Storage Shape

V1 can use relational tables for core entities and relationship edges, with embeddings for semantic retrieval. The product should not require a specialized graph database before proving the memory behavior.

Do not build full memory lifecycle behavior in V1. Design for it by keeping confidence, timestamps, source references, related objects, and future lifecycle fields available.
