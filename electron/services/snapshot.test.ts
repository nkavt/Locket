import { describe, expect, it, vi } from 'vitest';
import type { PersistedData } from '../db/types';
import { ticketFixture, useTestDb } from '../test/db';
import { DEFAULT_WORKFLOW } from '../workflows/rules';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { readSnapshot, readSnapshotIfInitialized, replaceSnapshot } = await import('./snapshot');

const CUSTOM = {
  id: 'wf-custom',
  name: 'Custom',
  statuses: [
    { id: 'open', name: 'Open', icon: 'flag', color: '#00838f', category: 'todo' as const },
    {
      id: 'closed',
      name: 'Closed',
      icon: 'cancel',
      color: 'error.main',
      category: 'cancelled' as const,
    },
  ],
};

const SEED: PersistedData = {
  workflows: [DEFAULT_WORKFLOW, CUSTOM],
  projects: [
    {
      id: 'p1',
      name: 'One',
      slug: 'one',
      icon: 'bolt',
      color: '#000',
      description: '',
      workflowId: 'default',
    },
    {
      id: 'p2',
      name: 'Two',
      slug: 'two',
      icon: 'bolt',
      color: '#fff',
      description: 'd',
      workflowId: 'wf-custom',
    },
  ],
  tickets: [
    ticketFixture({
      id: 'one-1',
      labels: ['bug', 'ui'],
      due: '2026-02-01',
      comments: [
        { id: 2, author: 'b', ts: '2026-01-02T00:00:00.000Z', body: 'later' },
        { id: 1, author: 'a', ts: '2026-01-01T00:00:00.000Z', body: 'earlier' },
      ],
    }),
    ticketFixture({ id: 'two-1', projectId: 'p2', status: 'closed' }),
  ],
  counters: { p1: 1, p2: 1 },
};

describe('snapshot service', () => {
  useTestDb(() => SEED);

  it('round-trips a whole workspace, ordering comments by time', async () => {
    const snap = await readSnapshot();
    expect(snap.workflows).toEqual(SEED.workflows);
    expect(snap.projects).toEqual(SEED.projects);
    expect(snap.counters).toEqual(SEED.counters);
    expect(snap.tickets.map((t) => t.id)).toEqual(['one-1', 'two-1']);
    const [later, earlier] = SEED.tickets[0].comments;
    expect(snap.tickets[0]).toEqual({
      ...SEED.tickets[0],
      comments: [earlier, later].map((c) => ({ ...c, attachments: [] })),
      attachments: [],
    });
  });

  it('reports an initialized workspace and replaces it wholesale', async () => {
    expect(await readSnapshotIfInitialized()).not.toBeNull();
    await replaceSnapshot({ workflows: [], projects: [], tickets: [], counters: {} });
    expect(await readSnapshot()).toEqual({
      workflows: [DEFAULT_WORKFLOW],
      projects: [],
      tickets: [],
      counters: {},
    });
  });

  it('puts data from before workflows on the default workflow, unchanged', async () => {
    const legacy = {
      projects: [
        { id: 'p1', name: 'One', slug: 'one', icon: 'bolt', color: '#000', description: '' },
      ],
      tickets: [
        ticketFixture({ id: 'one-1', status: 'in_progress' }),
        ticketFixture({ id: 'one-2', status: 'done' }),
      ],
      counters: { p1: 2 },
    };
    await replaceSnapshot(legacy);
    const snap = await readSnapshot();
    expect(snap.workflows).toEqual([DEFAULT_WORKFLOW]);
    expect(snap.projects[0].workflowId).toBe('default');
    expect(snap.tickets.map((t) => t.status)).toEqual(['in_progress', 'done']);
  });

  it("moves tickets whose status isn't in their workflow to its first todo status", async () => {
    await replaceSnapshot({
      ...SEED,
      tickets: [ticketFixture({ id: 'two-1', projectId: 'p2', status: 'in_progress' })],
    });
    expect((await readSnapshot()).tickets[0].status).toBe('open');
  });

  it('rejects malformed payloads without touching the data', async () => {
    await expect(replaceSnapshot({ projects: 'x' } as unknown as PersistedData)).rejects.toThrow(
      /Invalid data payload/,
    );
    expect((await readSnapshot()).projects).toHaveLength(2);
  });
});
