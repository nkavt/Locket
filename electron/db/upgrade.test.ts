import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { closeDb, initDb } = await import('./index');
const { readSnapshot } = await import('../services/snapshot');
const { DEFAULT_WORKFLOW } = await import('../workflows/rules');

// The schema v0.2.x wrote, exactly as TypeORM created it.
const V0_2_SCHEMA = `
CREATE TABLE "comments" ("id" integer NOT NULL, "ticketId" text NOT NULL, "author" text NOT NULL, "ts" text NOT NULL, "body" text NOT NULL, PRIMARY KEY ("id", "ticketId"));
CREATE INDEX "IDX_469fc1a5c6798a3b7a6de4dfc6" ON "comments" ("ticketId");
CREATE TABLE "counters" ("projectId" text PRIMARY KEY NOT NULL, "value" integer NOT NULL);
CREATE TABLE "meta" ("key" text PRIMARY KEY NOT NULL, "value" text NOT NULL);
CREATE TABLE "projects" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "slug" text NOT NULL, "icon" text NOT NULL, "color" text NOT NULL, "description" text NOT NULL, CONSTRAINT "UQ_96e045ab8b0271e5f5a91eae1ee" UNIQUE ("slug"));
CREATE TABLE "tickets" ("id" text PRIMARY KEY NOT NULL, "projectId" text NOT NULL, "title" text NOT NULL, "description" text NOT NULL, "status" text NOT NULL, "priority" text NOT NULL, "labels" text NOT NULL, "due" text, "author" text NOT NULL, "created" text NOT NULL, "updated" text NOT NULL);
CREATE INDEX "IDX_7ea2738d6dd730beda6fc2f2b4" ON "tickets" ("projectId");
INSERT INTO meta VALUES ('initialized', '1');
INSERT INTO projects VALUES ('one-ab12', 'One', 'one', 'bolt', '#1976d2', '# One');
INSERT INTO counters VALUES ('one-ab12', 3);
INSERT INTO tickets VALUES ('one-1', 'one-ab12', 'A', '', 'todo', 'medium', '[]', NULL, 'me', '2026-01-01', '2026-01-01');
INSERT INTO tickets VALUES ('one-2', 'one-ab12', 'B', '', 'in_progress', 'high', '["bug"]', '2026-02-01', 'me', '2026-01-01', '2026-01-02');
INSERT INTO tickets VALUES ('one-3', 'one-ab12', 'C', '', 'done', 'low', '[]', NULL, 'me', '2026-01-01', '2026-01-03');
INSERT INTO comments VALUES (1, 'one-2', 'me', '2026-01-02T00:00:00.000Z', 'hi');
`;

describe('upgrading a v0.2 database', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'locket-upgrade-'));
  const file = path.join(dir, 'locket.db');
  afterAll(async () => {
    await closeDb();
    rmSync(dir, { recursive: true, force: true });
  });

  it('adds the default workflow and keeps every project and ticket as it was', async () => {
    const { setAttachmentsRoot } = await import('../attachments/store');
    setAttachmentsRoot(path.join(dir, 'attachments'));
    // Write the old schema with a bare connection that knows no entities.
    const old = await new DataSource({ type: 'better-sqlite3', database: file }).initialize();
    for (const sql of V0_2_SCHEMA.split(';\n').filter((q) => q.trim())) await old.query(sql);
    await old.destroy();

    await initDb({ database: file });
    const snap = await readSnapshot();
    expect(snap.workflows).toEqual([DEFAULT_WORKFLOW]);
    expect(snap.projects).toEqual([
      {
        id: 'one-ab12',
        name: 'One',
        slug: 'one',
        icon: 'bolt',
        color: '#1976d2',
        description: '# One',
        workflowId: 'default',
      },
    ]);
    expect(snap.counters).toEqual({ 'one-ab12': 3 });
    expect(
      snap.tickets.map(({ id, status, priority, labels, due, updated }) => ({
        id,
        status,
        priority,
        labels,
        due,
        updated,
      })),
    ).toEqual([
      {
        id: 'one-1',
        status: 'todo',
        priority: 'medium',
        labels: [],
        due: null,
        updated: '2026-01-01',
      },
      {
        id: 'one-2',
        status: 'in_progress',
        priority: 'high',
        labels: ['bug'],
        due: '2026-02-01',
        updated: '2026-01-02',
      },
      {
        id: 'one-3',
        status: 'done',
        priority: 'low',
        labels: [],
        due: null,
        updated: '2026-01-03',
      },
    ]);
    expect(snap.tickets[1].comments.map((c) => c.body)).toEqual(['hi']);

    // A second start finds everything in place and seeds nothing twice.
    await closeDb();
    await initDb({ database: file });
    expect((await readSnapshot()).workflows).toEqual([DEFAULT_WORKFLOW]);
  });
});
