import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { TicketEntity } from '../entities/ticket.entity';
import type { PersistedComment, PersistedTicket, TicketFilter, TicketPatch } from '../types';
import * as comments from './comments';

type Row = Omit<PersistedTicket, 'comments'>;

const toRow = (t: PersistedTicket): Row => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  labels: t.labels || [],
  due: t.due ?? null,
  author: t.author,
  created: t.created,
  updated: t.updated,
});

const withComments = async (
  em: EntityManager,
  rows: TicketEntity[],
): Promise<PersistedTicket[]> => {
  const grouped = await comments.findByTicketIds(
    em,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, comments: grouped.get(r.id) ?? ([] as PersistedComment[]) }));
};

/** Tickets in creation order, narrowed by the indexed filter fields; label/query are applied by the service. */
export const findAll = async (
  em: EntityManager,
  filter: Pick<TicketFilter, 'projectId' | 'status' | 'priority'> = {},
): Promise<PersistedTicket[]> => {
  const where: FindOptionsWhere<TicketEntity> = {};
  if (filter.projectId) where.projectId = filter.projectId;
  if (filter.status) where.status = filter.status;
  if (filter.priority) where.priority = filter.priority;
  const qb = em.createQueryBuilder(TicketEntity, 't').orderBy('t.rowid');
  if (Object.keys(where).length) qb.where(where);
  return withComments(em, await qb.getMany());
};

export const findById = async (em: EntityManager, id: string): Promise<PersistedTicket | null> => {
  const row = await em.findOneBy(TicketEntity, { id });
  if (!row) return null;
  return (await withComments(em, [row]))[0];
};

export const findIdsByProject = async (em: EntityManager, projectId: string): Promise<string[]> =>
  (await em.find(TicketEntity, { select: { id: true }, where: { projectId } })).map((r) => r.id);

/** Number of tickets per project id. */
export const countByProject = async (em: EntityManager): Promise<Record<string, number>> => {
  const rows = await em
    .createQueryBuilder(TicketEntity, 't')
    .select('t.projectId', 'projectId')
    .addSelect('COUNT(*)', 'count')
    .groupBy('t.projectId')
    .getRawMany<{ projectId: string; count: number | string }>();
  return Object.fromEntries(rows.map((r) => [r.projectId, Number(r.count)]));
};

export const insert = async (em: EntityManager, t: PersistedTicket): Promise<void> => {
  await em.insert(TicketEntity, toRow(t));
};

export const insertMany = async (em: EntityManager, ts: PersistedTicket[]): Promise<void> => {
  if (ts.length) await em.insert(TicketEntity, ts.map(toRow));
};

export const update = async (
  em: EntityManager,
  id: string,
  patch: TicketPatch & { updated: string },
): Promise<void> => {
  await em.update(TicketEntity, { id }, patch);
};

export const remove = async (em: EntityManager, id: string): Promise<void> => {
  await em.delete(TicketEntity, { id });
};

export const removeByIds = async (em: EntityManager, ids: string[]): Promise<void> => {
  if (ids.length) await em.delete(TicketEntity, ids);
};

export const clear = async (em: EntityManager): Promise<void> => {
  await em.clear(TicketEntity);
};
