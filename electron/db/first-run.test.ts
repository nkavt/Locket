import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { closeDb, initDb } = await import('./index');
const { readSnapshot, readSnapshotIfInitialized } = await import('../services/snapshot');

describe('fresh database', () => {
  afterAll(() => closeDb());

  it('reads as null until first write, but as empty via readSnapshot', async () => {
    await initDb({ database: ':memory:' });
    expect(await readSnapshotIfInitialized()).toBeNull();
    expect(await readSnapshot()).toEqual({ projects: [], tickets: [], counters: {} });
  });
});
