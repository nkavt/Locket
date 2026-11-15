import type { EntityManager } from 'typeorm';
import * as store from '../attachments/store';
import { repos, withReader, withTransaction } from '../db';
import type { PersistedData } from '../db/types';
import { DEFAULT_PROJECT_ICON, isMaterialSymbol } from '../projects/icons';
import { normalizeData, type LoosePersistedData } from '../workflows/normalize';

const readAll = async (em: EntityManager): Promise<PersistedData> => {
  const [workflows, projects, tickets, counters] = await Promise.all([
    repos.workflows.findAll(em),
    repos.projects.findAll(em),
    repos.tickets.findAll(em),
    repos.counters.findAll(em),
  ]);
  return { workflows, projects, tickets, counters };
};

/**
 * Whole-workspace access. Used for renderer hydration, the change broadcast,
 * first-run seeding and "reset to samples" — never for ordinary edits, which
 * go through the per-entity services.
 */
export const readSnapshot = (): Promise<PersistedData> => withReader(readAll);

/** `null` on first run, before anything was ever written. */
export const readSnapshotIfInitialized = (): Promise<PersistedData | null> =>
  withReader(async (em) => ((await repos.meta.isInitialized(em)) ? readAll(em) : null));

const validate = (data: LoosePersistedData): void => {
  if (
    !data ||
    !Array.isArray(data.projects) ||
    !Array.isArray(data.tickets) ||
    typeof data.counters !== 'object' ||
    data.counters === null ||
    (data.workflows !== undefined && !Array.isArray(data.workflows))
  ) {
    throw new Error('Invalid data payload');
  }
};

/**
 * Replace everything with `data` in one transaction. Payloads from before workflows (no
 * `workflows`, no project `workflowId`) are accepted and put on the default workflow.
 */
export const replaceSnapshot = (input: PersistedData | LoosePersistedData): Promise<void> =>
  withTransaction(async (em) => {
    validate(input);
    const data = normalizeData(input);
    await repos.comments.clear(em);
    await repos.tickets.clear(em);
    await repos.projects.clear(em);
    await repos.counters.clear(em);
    await repos.workflows.clear(em);

    await repos.workflows.insertMany(em, data.workflows);
    // Names from older data may be ones the font can't draw: those fall back to the default.
    await repos.projects.insertMany(
      em,
      data.projects.map((p) =>
        isMaterialSymbol(p.icon) ? p : { ...p, icon: DEFAULT_PROJECT_ICON },
      ),
    );
    await repos.tickets.insertMany(em, data.tickets);
    await repos.comments.insertMany(
      em,
      data.tickets.flatMap((t) => (t.comments || []).map((c) => ({ ...c, ticketId: t.id }))),
    );
    await repos.counters.setMany(em, data.counters);
    await repos.meta.markInitialized(em);
    // Snapshots carry attachment metadata only, never the bytes, so a replace starts images over.
    await store.clear();
  });
