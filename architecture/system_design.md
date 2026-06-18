# System Design

## System Goals

- Capture anything through one universal inbox.
- Organize captured information automatically.
- Build persistent memory from raw inputs.
- Retrieve relevant context on demand.
- Queue explicit research requests when Ty marks memory as research-worthy.
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

It must be responsive and useful on both laptop and phone. V1 can avoid a full native mobile app, but it cannot ignore mobile capture.

### Quick Capture Surface

A minimal phone-first capture path for dumping ideas quickly.

V1 options:

- Responsive web capture page saved to the iPhone home screen.
- iOS Shortcut that submits text into the universal inbox.
- Lightweight PWA entry point.

A polished native app and widget can come later. The core requirement is that Ty can capture an idea from the phone home screen before it disappears.

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

### Research Queue

Tracks explicit research requests created from source items or memories.

The Research Queue is Phase 2.5 only. It should not run autonomous agents, scheduled research, continuous research, or web crawling. Its job is to preserve research intent and link later research outputs back into source-backed memory.

ResearchQueueItems may later generate:

- Competitor analysis
- Market research
- Related ideas
- User complaints
- Suggested next actions

Each research output should be stored back into memory and linked to the original ResearchQueueItem, source item, and memory where applicable.

## Data Flow

1. User captures input.
2. Raw input is stored as a CaptureItem.
3. Ingestion pipeline queues AI organization.
4. AI proposes objects, memories, relationships, and suggestions.
5. System stores proposals with confidence and source references.
6. User reviews or edits when needed.
7. Retrieval and suggestion layers use approved or high-confidence memory.

Optional Phase 2.5 research flow:

1. User marks a source item or memory for research.
2. System creates a ResearchQueueItem linked to the original source item, memory, or both.
3. Later research output is stored as source-backed memory.
4. The output links back to the ResearchQueueItem and original source or memory.

## User Control

The system may suggest actions, but the user controls whether actions are accepted, edited, dismissed, or deleted.

External side effects should require explicit approval in V1.

Research should require explicit user intent. The system may recommend that something is research-worthy later, but it should not silently start research.

## Privacy

Privacy-first design should be part of the architecture, not a later feature. V1 should include deletion, source visibility, memory explanations, and conservative defaults for proactive behavior.

## V1 Constraints

Do not build a full CRM, calendar app, travel booking system, password manager, expense suite, enterprise collaboration platform, browser extension, full native mobile app, complex dashboard, or multi-agent orchestration system in V1.

Do not confuse "no full native mobile app" with "no mobile capture." Cross-device capture is core to the product.

Do not build research agents, scheduled research, continuous research, or web crawling in V1. Phase 2.5 Research Queue is a documented future workflow on top of memory.
