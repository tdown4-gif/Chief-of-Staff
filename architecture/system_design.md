# System Design

## System Goals

- Capture anything through one universal inbox.
- Organize captured information automatically.
- Build persistent memory from raw inputs.
- Retrieve relevant context on demand.
- Research proactively when appropriate.
- Suggest actions while keeping the user in control.

## Architecture Thesis

Chief of Staff should not model information like a notes app:

1. Note
2. Folder
3. Tag

It should model information like a context system:

1. Capture
2. Raw input
3. Object extraction
4. Relationship graph
5. Memory layer
6. Search and chat
7. Proactive suggestions

The architecture exists to maintain context over time, not to make the user maintain structure.

## Core Components

### Web App

The first client for capture, review, search, object pages, and suggestions.

### Universal Inbox

Accepts raw notes, pasted text, links, document text, and manual entries.

### Ingestion Pipeline

Normalizes captured inputs, stores raw source material, and queues AI processing.

### AI Organization Service

Classifies capture items, extracts core objects, proposes memories, identifies relationships, and generates explanations.

### Memory Store

Persists durable memories, object records, relationships, source references, confidence scores, and privacy metadata.

### Retrieval Layer

Combines keyword search, structured filters, graph traversal, and semantic retrieval.

### Suggestion Engine

Creates user-controlled suggestions for tasks, follow-ups, research, project creation, and memory clarification.

### Research Agent

Runs proactive or user-requested research and attaches findings to companies, projects, opportunities, and open questions.

## Data Flow

1. User captures input.
2. Raw input is stored as a CaptureItem.
3. Ingestion pipeline queues AI organization.
4. AI proposes objects, memories, relationships, and suggestions.
5. System stores proposals with confidence and source references.
6. User reviews or edits when needed.
7. Retrieval and suggestion layers use approved or high-confidence memory.

## User Control

The system may suggest actions, but the user controls whether actions are accepted, edited, dismissed, or deleted.

External side effects should require explicit approval in V1.

## Privacy

Privacy-first design should be part of the architecture, not a later feature. V1 should include deletion, source visibility, memory explanations, and conservative defaults for proactive behavior.

## V1 Constraints

Do not build a full CRM, calendar app, travel booking system, password manager, expense suite, enterprise collaboration platform, browser extension, native mobile app, complex dashboard, or multi-agent orchestration system in V1.
