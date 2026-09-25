import { repos, withReader, withTransaction } from '../db';
import type { PersistedData } from '../db/types';

/**
 * Whole-workspace access. Used for renderer hydration, the change broadcast,
 * first-run seeding and "reset to samples" — never for ordinary edits, which
 * go through the per-entity services.
 */
export const readSnapshot = (): Promise<PersistedData> =>
  withReader(async (em) => {
    const [projects, tickets, counters] = await Promise.all([
      repos.projects.findAll(em),
      repos.tickets.findAll(em),
      repos.counters.findAll(em),
    ]);
    return { projects, tickets, counters };
  });

/** `null` on first run, before anything was ever written. */
export const readSnapshotIfInitialized = (): Promise<PersistedData | null> =>
  withReader(async (em) => {
    if (!(await repos.meta.isInitialized(em))) return null;
    const [projects, tickets, counters] = await Promise.all([
      repos.projects.findAll(em),
      repos.tickets.findAll(em),
      repos.counters.findAll(em),
    ]);
    return { projects, tickets, counters };
  });

const validate = (data: PersistedData): void => {
  if (
    !data ||
    !Array.isArray(data.projects) ||
    !Array.isArray(data.tickets) ||
    typeof data.counters !== 'object' ||
    data.counters === null
  ) {
    throw new Error('Invalid data payload');
  }
};

/** Replace everything with `data` in one transaction. */
export const replaceSnapshot = (data: PersistedData): Promise<void> =>
  withTransaction(async (em) => {
    validate(data);
    await repos.comments.clear(em);
    await repos.tickets.clear(em);
    await repos.projects.clear(em);
    await repos.counters.clear(em);

    await repos.projects.insertMany(em, data.projects);
    await repos.tickets.insertMany(em, data.tickets);
    await repos.comments.insertMany(
      em,
      data.tickets.flatMap((t) => (t.comments || []).map((c) => ({ ...c, ticketId: t.id }))),
    );
    await repos.counters.setMany(em, data.counters);
    await repos.meta.markInitialized(em);
  });
