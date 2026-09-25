import type { EntityManager } from 'typeorm';
import { getDataSource } from './data-source';
import { withDbLock } from './lock';

/**
 * Run `fn` inside one SQLite transaction. The lock keeps transactions from
 * different callers (MCP, IPC) from interleaving on the single connection.
 */
export const withTransaction = <T>(fn: (em: EntityManager) => Promise<T>): Promise<T> =>
  withDbLock(() => getDataSource().transaction(fn));

/** Run a read-only `fn` against the connection, never inside someone else's transaction. */
export const withReader = <T>(fn: (em: EntityManager) => Promise<T>): Promise<T> =>
  withDbLock(() => fn(getDataSource().manager));
