import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

test("Supabase schema preserves the memory tables with Postgres-native types", () => {
  assert.match(schema, /create table if not exists public\.source_items/i);
  assert.match(schema, /create table if not exists public\.memories/i);
  assert.match(schema, /create table if not exists public\.recall_feedback/i);
  assert.match(schema, /metadata_json jsonb/i);
  assert.match(schema, /created_at timestamptz/i);
});

test("Supabase schema constrains memory kinds statuses and feedback actions", () => {
  assert.match(schema, /kind in \('person', 'project', 'idea', 'commitment'\)/i);
  assert.match(schema, /status in \('active', 'needs_review', 'done', 'dismissed'\)/i);
  assert.match(schema, /action in \('not_relevant', 'promote_to_memory', 'add_context'\)/i);
});
