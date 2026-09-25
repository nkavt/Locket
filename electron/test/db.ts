import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { PersistedData, PersistedTicket } from '../db/types';

export const emptySeed = (): PersistedData => ({ projects: [], tickets: [], counters: {} });

export const ticketFixture = (overrides: Partial<PersistedTicket> = {}): PersistedTicket => ({
  id: 'one-1',
  projectId: 'p1',
  title: 'A ticket',
  description: '',
  status: 'todo',
  priority: 'medium',
  labels: [],
  due: null,
  author: 'me',
  created: '2026-01-01',
  updated: '2026-01-01',
  comments: [],
  ...overrides,
});

/**
 * Real SQLite in memory for the electron test project, reseeded before every
 * test. Needs Electron's node (see the `test` script): better-sqlite3 is built
 * against Electron's ABI. Test files must also `vi.mock('electron', ...)`.
 */
export function useTestDb(seed: () => PersistedData = emptySeed): void {
  beforeAll(async () => {
    const { initDb } = await import('../db');
    await initDb({ database: ':memory:' });
  });

  beforeEach(async () => {
    const { replaceSnapshot } = await import('../services/snapshot');
    await replaceSnapshot(seed());
  });

  afterAll(async () => {
    const { closeDb } = await import('../db');
    await closeDb();
  });
}
