import { getDataSource } from './data-source';
import { CommentEntity } from './entities/comment.entity';
import { CounterEntity } from './entities/counter.entity';
import { MetaEntity } from './entities/meta.entity';
import { ProjectEntity } from './entities/project.entity';
import { TicketEntity, fromTicket, toTicket } from './entities/ticket.entity';
import { withDbLock } from './lock';
import { emptyData, type PersistedComment, type PersistedData } from './types';

/**
 * Raw load. `null` means "never saved" (first run), which the renderer treats
 * differently from a legitimately empty workspace. Callers must hold the lock.
 */
export const loadData = async (): Promise<PersistedData | null> => {
  const ds = getDataSource();
  const initialized = await ds.getRepository(MetaEntity).findOneBy({ key: 'initialized' });
  if (!initialized) return null;

  const [projects, tickets, comments, counters] = await Promise.all([
    ds.getRepository(ProjectEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(TicketEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(CommentEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(CounterEntity).find(),
  ]);

  const commentsByTicket = new Map<string, PersistedComment[]>();
  for (const { ticketId, id, author, ts, body } of comments) {
    const list = commentsByTicket.get(ticketId) || [];
    list.push({ id, author, ts, body });
    commentsByTicket.set(ticketId, list);
  }

  return {
    projects: projects.map(({ id, name, slug, icon, color, description }) => ({
      id,
      name,
      slug,
      icon,
      color,
      description,
    })),
    tickets: tickets.map((t) => toTicket(t, commentsByTicket.get(t.id) || [])),
    counters: Object.fromEntries(counters.map((c) => [c.projectId, c.value])),
  };
};

const validateData = (data: PersistedData): void => {
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

/** Raw whole-document save. Callers must hold the lock. */
export const saveData = async (data: PersistedData): Promise<void> => {
  validateData(data);
  const ds = getDataSource();
  await ds.transaction(async (em) => {
    await em.clear(CommentEntity);
    await em.clear(TicketEntity);
    await em.clear(ProjectEntity);
    await em.clear(CounterEntity);

    await em.save(
      ProjectEntity,
      data.projects.map((p, position) => ({ ...p, position })),
    );
    await em.save(TicketEntity, data.tickets.map(fromTicket));
    await em.save(
      CommentEntity,
      data.tickets.flatMap((t) =>
        (t.comments || []).map((c, position) => ({ ...c, ticketId: t.id, position })),
      ),
    );
    await em.save(
      CounterEntity,
      Object.entries(data.counters).map(([projectId, value]) => ({ projectId, value })),
    );
    await em.save(MetaEntity, { key: 'initialized', value: '1' });
  });
};

/** Read the current dataset under the lock; an unsaved database reads as empty. */
export const readData = (): Promise<PersistedData> =>
  withDbLock(async () => (await loadData()) ?? emptyData());

/** Apply a mutation to the whole dataset under the lock and persist it. */
export const mutate = <T>(fn: (data: PersistedData) => T): Promise<T> =>
  withDbLock(async () => {
    const data = (await loadData()) ?? emptyData();
    const result = fn(data);
    await saveData(data);
    return result;
  });
