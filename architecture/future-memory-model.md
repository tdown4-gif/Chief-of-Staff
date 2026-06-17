# Future Memory Model

## Status

This document is future architecture only.

Do not introduce these concepts into the active codebase until real-world V1 usage reveals where the current memory model breaks.

The purpose is to preserve future optionality without building future complexity.

## Current Foundation

The active V1 model should remain simple:

- Raw source items preserve messy capture.
- Proposed memories are derived from raw sources.
- Memories stay source-backed.
- Weak memories are visible and reviewable.
- Recall returns source proof.
- Feedback records trust signals.

This is enough for Trusted External Memory. Future structure should grow from observed usage, not speculation.

## Design Principle

Raw captures are permanent evidence.

Extracted memories are revisable interpretations.

Future intelligence should be able to reprocess old captures, create better memories, merge duplicates, explain relationships, and learn from Ty's corrections without requiring a rewrite.

## Future Concepts

### Entities

Entities are stable things the system recognizes over time.

Possible entity types:

- Person
- Company
- Project
- Idea
- Place
- Topic
- Event
- Document
- Skill
- Opportunity
- Preference area

An entity is not just one extracted memory. It is the long-lived object that many memories may describe.

Example:

- Entity: Sarah Chen
- Memories: pricing follow-up, demo note, founder intro, conversation at conference
- Sources: multiple raw captures over time

V1 should not create entity tables yet. It should preserve enough source and memory data that entities can be created later.

### Relationships

Relationships connect entities, memories, and sources.

Possible relationship types:

- person related to project
- person works at company
- idea belongs to project
- commitment owed to person
- event mentioned person
- preference applies to travel
- opportunity related to company
- memory derived from source
- correction supersedes memory

Relationships should be explainable and source-backed. They should carry uncertainty because many connections will be inferred.

### Observations

Observations are time-stamped claims derived from source material.

They are useful when the system needs to remember what was true, stated, or noticed at a specific time without prematurely turning it into a permanent fact.

Examples:

- "Ty mentioned avoiding native iPhone until web capture works" on June 17, 2026.
- "Sarah pricing was unresolved after the demo" from a capture.
- "Insurance renewal follow-up appeared in several notes" across a period.

Observations can later support trend detection, preference learning, stale-memory checks, and source-backed summaries.

### Preferences

Preferences are durable Ty-specific defaults, likes, dislikes, constraints, and working patterns.

Preference memory should be conservative. A single messy note should usually create an observation, not a durable preference.

Examples:

- Ty prefers source proof over polished AI certainty.
- Ty wants web/PWA first before native app.
- Ty dislikes systems that require manual organization.
- Ty may avoid certain travel periods or conditions.

Preferences should include:

- source proof
- confidence
- first observed date
- last confirmed date
- contradiction history

### Corrections

Corrections are user actions that teach the system.

Possible correction events:

- Edit memory content
- Mark not relevant
- Promote raw source to memory
- Add missing context
- Dismiss memory
- Delete memory
- Merge duplicate people or projects
- Split confused entities
- Mark stale
- Confirm still true

The future model should store correction events, not only the final changed memory. The history of corrections is how the system learns Ty's preferences and improves trust.

### Provenance

Provenance explains where a memory, entity, relationship, or observation came from.

Future provenance should track:

- raw source id
- source snippet or span
- extraction method
- extractor version
- creation timestamp
- user edits
- confirmation status
- confidence explanation
- related correction events

Provenance is central to trust. The system should always be able to answer: "Why do you think this?"

### Salience

Salience is the system's estimate of how important or useful something is.

Possible signals:

- recurrence across captures
- recent use in recall
- user confirmation
- correction history
- relationship to active projects
- relationship to commitments
- time sensitivity
- explicit user emphasis
- source reliability

Salience should affect ranking and surfacing, not whether raw memory is preserved.

Low-salience information can remain stored but appear less often. High-salience information can become easier to recall, summarize, or include in prompts.

## Future Shape

A later model may include:

- `source_items`: immutable raw captures
- `memories`: source-backed extracted memory statements
- `entities`: stable people, projects, ideas, companies, places, topics, and other long-lived objects
- `relationships`: typed source-backed connections
- `observations`: time-stamped claims
- `preferences`: durable Ty-specific defaults and constraints
- `corrections`: user feedback and edits as learning events
- `provenance`: source spans, extraction metadata, and explanation trails
- `salience`: ranking and usefulness signals

This is not a V1 implementation plan. It is the likely direction if V1 usage proves the need.

## What To Capture Now

Without adding new tables, V1 should continue preserving:

- raw capture text
- source type
- timestamp
- proposed memory content
- memory kind
- review status
- confidence label and explanation
- rationale
- metadata
- source proof
- user feedback actions
- no-memory outcomes

These records keep future reprocessing possible.

## Optionality Rules

- Preserve raw source before optimizing extraction.
- Treat AI output as derived and revisable.
- Prefer metadata over workflows when uncertain.
- Store user corrections as learning signals when possible.
- Avoid domain-specific tables until a real pattern repeats.
- Do not build travel, gifts, CRM, skills, SBIR, research, or proactive agents before memory trust is strong.
- Let future architecture be pulled by usage failures, not imagined completeness.

## Rewrite Avoidance

The current architecture can grow if it maintains these boundaries:

- Raw source remains separate from extracted memory.
- Memory points back to source.
- Confidence and uncertainty remain explicit.
- Feedback is stored rather than discarded.
- Future entities and relationships can be derived from existing captures and memories.

The system should be able to become Chief of Staff by adding connected memory primitives, not by replacing the V1 foundation.
