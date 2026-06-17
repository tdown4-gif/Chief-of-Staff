# MVP

## Internal V1 Name

Trusted External Memory.

The V1 product is not Chief of Staff yet. It is the memory foundation that a chief-of-staff experience can later sit on.

## Smallest Useful Version

The MVP is a dead-simple capture and recall system that lets Ty dump messy context and reliably recover it later with source-backed answers.

It should prove one central behavior: Ty can throw information into the system and later receive accurate, explainable, useful memory without manually maintaining a personal knowledge base.

The product should excel at:

1. Capture
2. Recall
3. Context
4. Source-backed retrieval

The product does not need to excel at:

- Research
- Travel
- Gifts
- Resume updates
- Skills graphs
- CRM
- SBIR tracking
- Calendar management

Those may become future applications of the memory layer.

## V1 Jobs To Be Done

- Capture a thought, note, link, document summary, task, event, or contact detail quickly.
- Capture from laptop and phone without deciding where the information belongs.
- Provide an iPhone-friendly quick capture path, ideally from the home screen.
- Automatically identify a small set of useful memory objects.
- Extract people, projects, ideas, commitments, and source context.
- Show where each memory came from.
- Retrieve relevant memory by search or natural language question.
- Answer questions like "Who was that insurance guy I met?" and "What AI business ideas have I mentioned more than once?"
- Let the user edit, dismiss, or delete AI-generated memory.

## V1 Core Flows

1. Capture something into the universal inbox.
2. AI analyzes the item and proposes source-backed memory.
3. System stores the raw source and extracted memory with confidence.
4. User asks a question later.
5. System recalls the answer with source proof and related context.

## MVP Scope

- Web app.
- Cross-device responsive capture experience.
- iPhone home-screen capture shortcut or lightweight PWA entry point.
- Fast iPhone browser capture without a native App Store build.
- Universal inbox.
- Manual capture form.
- File or document text capture.
- AI extraction for people, projects, ideas, commitments, and sources.
- Search and conversational retrieval.
- Memory source citations.
- Basic open-loops list after recall quality is trustworthy.

## Explicit Non-Goals

- Full CRM
- Full calendar app
- Travel booking
- Password manager
- Expense management suite
- Enterprise collaboration
- Browser extension
- Full native mobile app
- Complex dashboards
- Proactive research
- Gift reminders
- Resume updates
- Skills graph
- SBIR tracking
- Travel preference learning
- Relationship intelligence
- Calendar management

## MVP Success Criteria

- Ty captures information without deciding where it belongs.
- Ty can capture an idea from laptop or phone in seconds.
- Ty can dump 1,000 things into the system and still retrieve useful context months later.
- The system can reliably answer questions about people, ideas, commitments, and projects.
- Every answer can be traced back to source material.
- Search and chat are faster than Ty's current habit of re-researching or trying to remember.
- The product reduces cognitive load instead of creating another system to maintain.

## Key Risks

- The product may become a prettier junk drawer.
- The AI may over-organize and create clutter.
- Memory mistakes can reduce trust quickly.
- Privacy expectations will be high because the system handles sensitive context.
- The MVP may be too broad if every core object is treated as equally important.
- One inbox can become one giant pile if retrieval quality is weak.
- Review workflows can become homework.
- If phone capture is clumsy, Ty will lose ideas before they enter the system.

## V1 Test Questions

- Can it answer: "Who was that insurance guy I met?"
- Can it answer: "What were my AI business ideas from March?"
- Can it answer: "What commitments have I made recently?"
- Can it answer: "What am I forgetting?"
- Can it answer: "What were the insurance AI ideas I mentioned more than once?"

If the answer is no, no amount of travel planning, gift reminders, or proactive research matters.
