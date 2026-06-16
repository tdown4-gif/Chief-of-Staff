# Operating Model

## Source Of Truth

GitHub is the handoff layer.

Repository: `tdown4-gif/Chief-of-Staff`

Every agent or machine should be able to:

1. Pull latest `main`.
2. Read `AGENTS.md`.
3. Read `vision/product_vision.md`.
4. Read `vision/mvp.md`.
5. Read `docs/hermes_build_brief.md`.
6. Run or continue the current implementation.

## Agent Roles

### Hermes VPS

Primary long-running builder.

Use Hermes for:

- Scaffolding the app.
- Running dev servers.
- Running background jobs.
- Testing ingestion and retrieval.
- Committing and pushing incremental build progress.
- Keeping work resumable while Ty is away from the laptop.

### Codex

Primary repo maintainer, reviewer, and implementation partner.

Use Codex for:

- Tightening architecture.
- Reviewing Hermes output.
- Reducing complexity.
- Fixing implementation issues.
- Keeping docs aligned with code.

### Claude Code

Second implementation and review agent.

Use Claude Code for:

- Code review.
- Refactor suggestions.
- Edge-case analysis.
- Alternate architecture critique.

### Bridge Swarm

Parallel decomposition and research.

Use Bridge Swarm for:

- Competitive research.
- Data-model alternatives.
- UX critique.
- Task breakdown.

## Coordination Rules

- Pull before starting work.
- Keep changes scoped.
- Commit useful checkpoints.
- Push cleanly when a phase is done.
- Do not build future features unless the current build goal explicitly requires them.
- If an agent changes direction, update docs before implementing.

## Current Build Principle

The current product is not a full chief-of-staff system.

The current product is Trusted External Memory.

Success means Ty can capture messy context from laptop or phone and later retrieve it with source-backed answers.

## Resume Checklist

When resuming from any device or agent:

1. Check `git status --short --branch`.
2. Pull latest `main`.
3. Read the latest commit log.
4. Open `docs/hermes_build_brief.md`.
5. Continue the next unchecked build goal.
