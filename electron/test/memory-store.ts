import { emptyData, type PersistedData } from '../db/types';

/**
 * In-memory stand-in for `db/store`. Mirrors the real load -> mutate -> save
 * semantics (callers get clones, not live references) without touching
 * Electron, TypeORM or disk. Wire it in at the top of a test file with:
 *
 *   vi.mock('../db/store', () => import('../test/memory-store'));
 */
export const memory: { data: PersistedData } = { data: emptyData() };

export const resetMemory = (data: PersistedData = emptyData()): void => {
  memory.data = structuredClone(data);
};

export const readData = async (): Promise<PersistedData> => structuredClone(memory.data);

export const mutate = async <T>(fn: (data: PersistedData) => T): Promise<T> => {
  const draft = structuredClone(memory.data);
  const result = fn(draft);
  memory.data = draft;
  return result;
};
