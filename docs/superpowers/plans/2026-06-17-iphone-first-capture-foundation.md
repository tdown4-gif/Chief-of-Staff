# iPhone-First Capture Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Trusted External Memory usable every day from Ty's iPhone and laptop by adding a deployable shared persistence path, authenticated Shortcut capture, and real model-backed extraction without adding new product domains.

**Architecture:** Keep raw capture as the durable core. Introduce a database adapter boundary first so the app can keep using local SQLite in dev/test while production can later use Turso/libSQL. Add the iPhone Shortcut capture API after the shared DB path exists, and make model extraction fail-soft so a provider failure never prevents source persistence.

**Tech Stack:** Next.js App Router, TypeScript, local SQLite via `better-sqlite3`, future hosted SQLite via Turso/libSQL, existing OpenAI Responses provider hook, Node test runner.

---

## Build Track

This track should land as small PRs:

1. **PR 1: Database adapter/deployable backend path**
2. **PR 2: Turso/libSQL persistence**
3. **PR 3: Authenticated `POST /api/capture` for iOS Shortcut**
4. **PR 4: iOS Shortcut setup documentation**
5. **PR 5: Real model-backed extraction hardening**

Do not add travel, gifts, CRM, skills, SBIR, research agents, calendar workflows, dashboards, native iOS, SMS, or Telegram in this track.

## Files And Responsibilities

- `lib/db-types.ts`: shared domain and database input/output types currently owned by `lib/db.ts`.
- `lib/db-local.ts`: local SQLite implementation using `better-sqlite3`, migrations, validation, and SQL mapping.
- `lib/db.ts`: public database facade that exports the existing DB API and delegates to the active adapter.
- `tests/db-adapter.test.mjs`: adapter contract tests proving the public facade keeps local behavior and selects the local adapter by default.
- `README.md`: deployment-facing environment variable notes for local SQLite fallback and future hosted DB selection.
- `.env.example`: non-secret environment variable names for deploy/setup, including future `CAPTURE_API_TOKEN`.
- Future PR files:
  - `lib/db-libsql.ts`: Turso/libSQL adapter.
  - `app/api/capture/route.ts`: authenticated Shortcut capture endpoint.
  - `docs/iphone_shortcut_capture.md`: Ty setup instructions.

---

## PR 1: Database Adapter / Deployable Backend Path

### Task 1: Add Shared DB Types

**Files:**
- Create: `lib/db-types.ts`
- Modify: `lib/db.ts`
- Test: existing suite

- [ ] **Step 1: Create `lib/db-types.ts`**

Move only exported type declarations from `lib/db.ts` into `lib/db-types.ts`:

```ts
export type SourceItem = {
  id: number;
  content: string;
  sourceType: string;
  createdAt: string;
};

export type MemoryKind = "person" | "project" | "idea" | "commitment";
export type MemoryStatus = "active" | "needs_review" | "done" | "dismissed";
export type RecallFeedbackAction = "not_relevant" | "promote_to_memory" | "add_context";

export type Memory = {
  id: number;
  sourceItemId: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadataJson: string | null;
  status: MemoryStatus;
  createdAt: string;
};

export type CreateMemoryInput = {
  sourceItemId: number;
  kind: MemoryKind;
  content: string;
  confidence: number;
  rationale: string;
  metadataJson?: string | null;
  status?: MemoryStatus;
};

export type MemoriesBySourceId = Record<number, Memory[]>;

export type MemoryWithSource = {
  memory: Memory;
  source: SourceItem;
};

export type RecallFeedback = {
  id: number;
  query: string;
  action: RecallFeedbackAction;
  sourceItemId: number;
  memoryId: number | null;
  note: string | null;
  createdAt: string;
};

export type CreateRecallFeedbackInput = {
  query: string;
  action: RecallFeedbackAction;
  sourceItemId: number;
  memoryId?: number | null;
  note?: string | null;
};

export type MemoryDatabase = {
  createSourceItem(content: string, sourceType?: string): SourceItem;
  listRecentSourceItems(limit?: number): SourceItem[];
  countSourceItems(): number;
  createMemory(input: CreateMemoryInput): Memory;
  createMemories(inputs: CreateMemoryInput[]): Memory[];
  listMemoriesForSource(sourceItemId: number): Memory[];
  listMemoriesForSources(sourceItemIds: number[]): MemoriesBySourceId;
  updateMemoryStatus(memoryId: number, status: MemoryStatus): Memory;
  updateMemoryContent(memoryId: number, content: string): Memory;
  deleteMemory(memoryId: number): boolean;
  updateCommitmentStatus(memoryId: number, status: MemoryStatus): Memory | null;
  listOpenCommitments(limit?: number): MemoryWithSource[];
  listMemoriesNeedingReview(limit?: number): MemoryWithSource[];
  createRecallFeedback(input: CreateRecallFeedbackInput): RecallFeedback;
  listRecallFeedback(limit?: number): RecallFeedback[];
};
```

- [ ] **Step 2: Update imports in `lib/db.ts`**

Import these types from `./db-types.ts` and re-export them from `lib/db.ts` so app code does not need to change:

```ts
export type {
  CreateMemoryInput,
  CreateRecallFeedbackInput,
  MemoriesBySourceId,
  Memory,
  MemoryDatabase,
  MemoryKind,
  MemoryStatus,
  MemoryWithSource,
  RecallFeedback,
  RecallFeedbackAction,
  SourceItem
} from "./db-types.ts";
```

- [ ] **Step 3: Run type/build checks**

Run:

```bash
npm run build
```

Expected: build passes with no type errors.

### Task 2: Split Local SQLite Implementation Behind Adapter

**Files:**
- Create: `lib/db-local.ts`
- Modify: `lib/db.ts`
- Test: `tests/db-adapter.test.mjs`

- [ ] **Step 1: Write failing adapter test**

Create `tests/db-adapter.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function importWithTempDb(modulePath) {
  const dir = mkdtempSync(path.join(tmpdir(), "chief-of-staff-db-adapter-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  return import(`${modulePath}?db=${Date.now()}-${Math.random()}`);
}

test("public db facade uses local sqlite adapter by default", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");

  assert.equal(dbModule.getDatabaseAdapterKind(), "local-sqlite");
});

test("public db facade preserves capture and memory behavior through adapter", async () => {
  const dbModule = await importWithTempDb("../lib/db.ts");
  const source = dbModule.createSourceItem("Met Sarah. Need to send pricing.", "text");
  const memory = dbModule.createMemory({
    sourceItemId: source.id,
    kind: "commitment",
    content: "Send Sarah pricing",
    confidence: 92,
    rationale: "The source says Ty needs to send pricing."
  });

  assert.equal(dbModule.listRecentSourceItems(1)[0].content, "Met Sarah. Need to send pricing.");
  assert.equal(dbModule.listMemoriesForSource(source.id)[0].id, memory.id);
  assert.equal(dbModule.listOpenCommitments()[0].memory.content, "Send Sarah pricing");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/db-adapter.test.mjs
```

Expected: fails because `getDatabaseAdapterKind` does not exist.

- [ ] **Step 3: Move implementation to `lib/db-local.ts`**

Move current `lib/db.ts` implementation into `lib/db-local.ts`. It should export:

```ts
export const localSqliteDatabase: MemoryDatabase = {
  createSourceItem,
  listRecentSourceItems,
  countSourceItems,
  createMemory,
  createMemories,
  listMemoriesForSource,
  listMemoriesForSources,
  updateMemoryStatus,
  updateMemoryContent,
  deleteMemory,
  updateCommitmentStatus,
  listOpenCommitments,
  listMemoriesNeedingReview,
  createRecallFeedback,
  listRecallFeedback
};
```

Keep all existing local SQLite validation, migration, transaction, and mapping logic intact.

- [ ] **Step 4: Replace `lib/db.ts` with facade**

`lib/db.ts` should select the adapter and export the existing function names:

```ts
import { localSqliteDatabase } from "./db-local.ts";
import type {
  CreateMemoryInput,
  CreateRecallFeedbackInput,
  MemoryDatabase,
  MemoryStatus
} from "./db-types.ts";

export type {
  CreateMemoryInput,
  CreateRecallFeedbackInput,
  MemoriesBySourceId,
  Memory,
  MemoryDatabase,
  MemoryKind,
  MemoryStatus,
  MemoryWithSource,
  RecallFeedback,
  RecallFeedbackAction,
  SourceItem
} from "./db-types.ts";

function getDatabase(): MemoryDatabase {
  return localSqliteDatabase;
}

export function getDatabaseAdapterKind(): "local-sqlite" {
  return "local-sqlite";
}

export const createSourceItem = (...args: Parameters<MemoryDatabase["createSourceItem"]>) =>
  getDatabase().createSourceItem(...args);
export const listRecentSourceItems = (...args: Parameters<MemoryDatabase["listRecentSourceItems"]>) =>
  getDatabase().listRecentSourceItems(...args);
export const countSourceItems = (...args: Parameters<MemoryDatabase["countSourceItems"]>) =>
  getDatabase().countSourceItems(...args);
export const createMemory = (input: CreateMemoryInput) => getDatabase().createMemory(input);
export const createMemories = (...args: Parameters<MemoryDatabase["createMemories"]>) =>
  getDatabase().createMemories(...args);
export const listMemoriesForSource = (...args: Parameters<MemoryDatabase["listMemoriesForSource"]>) =>
  getDatabase().listMemoriesForSource(...args);
export const listMemoriesForSources = (...args: Parameters<MemoryDatabase["listMemoriesForSources"]>) =>
  getDatabase().listMemoriesForSources(...args);
export const updateMemoryStatus = (memoryId: number, status: MemoryStatus) =>
  getDatabase().updateMemoryStatus(memoryId, status);
export const updateMemoryContent = (...args: Parameters<MemoryDatabase["updateMemoryContent"]>) =>
  getDatabase().updateMemoryContent(...args);
export const deleteMemory = (...args: Parameters<MemoryDatabase["deleteMemory"]>) =>
  getDatabase().deleteMemory(...args);
export const updateCommitmentStatus = (memoryId: number, status: MemoryStatus) =>
  getDatabase().updateCommitmentStatus(memoryId, status);
export const listOpenCommitments = (...args: Parameters<MemoryDatabase["listOpenCommitments"]>) =>
  getDatabase().listOpenCommitments(...args);
export const listMemoriesNeedingReview = (...args: Parameters<MemoryDatabase["listMemoriesNeedingReview"]>) =>
  getDatabase().listMemoriesNeedingReview(...args);
export const createRecallFeedback = (input: CreateRecallFeedbackInput) =>
  getDatabase().createRecallFeedback(input);
export const listRecallFeedback = (...args: Parameters<MemoryDatabase["listRecallFeedback"]>) =>
  getDatabase().listRecallFeedback(...args);
```

- [ ] **Step 5: Run adapter test**

Run:

```bash
node --test tests/db-adapter.test.mjs
```

Expected: passes.

### Task 3: Add Deploy Environment Documentation

**Files:**
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create `.env.example`**

```env
# Local development SQLite fallback.
# Leave unset to use data/chief-of-staff.db.
DATABASE_URL=file:./data/chief-of-staff.db

# Future hosted Turso/libSQL persistence.
# PR 2 will wire these into the database adapter.
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Future iPhone Shortcut capture API.
# Generate a long random value and never commit a real token.
CAPTURE_API_TOKEN=

# Optional model-backed extraction.
MODEL_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.1-mini
```

- [ ] **Step 2: Update `README.md`**

Add a short section:

```md
### Deployment Environment

Local development uses SQLite by default at `data/chief-of-staff.db`.

For the iPhone-first MVP path, production will use hosted Turso/libSQL so phone and laptop share one data store. PR 1 keeps the local SQLite fallback and introduces the adapter boundary. PR 2 wires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

Future Shortcut capture will use `CAPTURE_API_TOKEN`. Generate a long random token, store it only in deployment secrets and the iOS Shortcut, never log it, and rotate it by replacing the deployment secret and updating the Shortcut header.
```

- [ ] **Step 3: Run checks**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit PR 1**

```bash
git add .env.example README.md lib/db.ts lib/db-local.ts lib/db-types.ts tests/db-adapter.test.mjs
git commit -m "Add database adapter boundary"
```

---

## PR 2: Turso/libSQL Persistence

### Task 1: Add libSQL Dependency And Adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/db-libsql.ts`
- Modify: `lib/db.ts`
- Test: `tests/db-adapter.test.mjs`

- [ ] Add `@libsql/client`.
- [ ] Implement `libsqlDatabase` with the same `MemoryDatabase` interface.
- [ ] Select libSQL when both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set.
- [ ] Keep local SQLite as default for dev/test.
- [ ] Add tests for adapter selection without making network calls.

## PR 3: Authenticated `POST /api/capture`

### Task 1: Add Shortcut Capture API

**Files:**
- Create: `app/api/capture/route.ts`
- Test: `tests/api-capture.test.mjs`
- Modify: `.env.example`

- [ ] Accept JSON `{ "content": "..." }`.
- [ ] Require `Authorization: Bearer ${CAPTURE_API_TOKEN}`.
- [ ] Return generic `401` on missing or wrong auth.
- [ ] Never log `CAPTURE_API_TOKEN`.
- [ ] Save raw source before extraction.
- [ ] Return `{ "ok": true, "sourceItemId": number }`.
- [ ] Catch extraction errors and still return success if raw capture persisted.

## PR 4: iOS Shortcut Instructions

### Task 1: Document Ty's Primary Capture Flow

**Files:**
- Create: `docs/iphone_shortcut_capture.md`
- Modify: `README.md`

- [ ] Document Dictate Text / Ask for Input.
- [ ] Document Get Contents of URL POST JSON.
- [ ] Document `Authorization` header setup.
- [ ] Document confirmation behavior.
- [ ] Document token rotation.

## PR 5: Real Model-Backed Extraction Hardening

### Task 1: Make Provider Setup Production-Ready

**Files:**
- Modify: `README.md`
- Modify: `tests/model-provider.test.mjs`
- Modify: `lib/model-provider.ts` only if needed.

- [ ] Confirm OpenAI env vars are documented.
- [ ] Verify provider failure falls back deterministically.
- [ ] Add a dogfood command or test path comparing provider output against source-backed expectations.

