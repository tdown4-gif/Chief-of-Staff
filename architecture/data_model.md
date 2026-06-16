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

## V1 Storage Shape

V1 can use relational tables for core entities and relationship edges, with embeddings for semantic retrieval. The product should not require a specialized graph database before proving the memory behavior.
