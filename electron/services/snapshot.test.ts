import { describe, expect, it, vi } from 'vitest';
import type { PersistedData } from '../db/types';
import { ticketFixture, useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { readSnapshot, readSnapshotIfInitialized, replaceSnapshot } = await import('./snapshot');

const SEED: PersistedData = {
  projects: [
    { id: 'p1', name: 'One', slug: 'one', icon: 'bolt', color: '#000', description: '' },
    { id: 'p2', name: 'Two', slug: 'two', icon: 'bolt', color: '#fff', description: 'd' },
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
    ticketFixture({ id: 'two-1', projectId: 'p2' }),
  ],
  counters: { p1: 1, p2: 1 },
};

describe('snapshot service', () => {
  useTestDb(() => SEED);

  it('round-trips a whole workspace, ordering comments by time', async () => {
    const snap = await readSnapshot();
    expect(snap.projects).toEqual(SEED.projects);
    expect(snap.counters).toEqual(SEED.counters);
    expect(snap.tickets.map((t) => t.id)).toEqual(['one-1', 'two-1']);
    expect(snap.tickets[0]).toEqual({
      ...SEED.tickets[0],
      comments: [SEED.tickets[0].comments[1], SEED.tickets[0].comments[0]],
    });
  });

  it('reports an initialized workspace and replaces it wholesale', async () => {
    expect(await readSnapshotIfInitialized()).not.toBeNull();
    await replaceSnapshot({ projects: [], tickets: [], counters: {} });
    expect(await readSnapshot()).toEqual({ projects: [], tickets: [], counters: {} });
  });

  it('rejects malformed payloads without touching the data', async () => {
    await expect(replaceSnapshot({ projects: 'x' } as unknown as PersistedData)).rejects.toThrow(
      /Invalid data payload/,
    );
    expect((await readSnapshot()).projects).toHaveLength(2);
  });
});
