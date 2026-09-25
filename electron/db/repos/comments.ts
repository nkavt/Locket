import { In, type EntityManager } from 'typeorm';
import { CommentEntity } from '../entities/comment.entity';
import type { PersistedComment } from '../types';

const toModel = (e: CommentEntity): PersistedComment => ({
  id: e.id,
  author: e.author,
  ts: e.ts,
  body: e.body,
});

/** Comments for the given tickets, grouped by ticket id and ordered by time. */
export const findByTicketIds = async (
  em: EntityManager,
  ticketIds: string[],
): Promise<Map<string, PersistedComment[]>> => {
  const grouped = new Map<string, PersistedComment[]>();
  if (!ticketIds.length) return grouped;
  const rows = await em.find(CommentEntity, {
    where: { ticketId: In(ticketIds) },
    order: { ts: 'ASC', id: 'ASC' },
  });
  for (const row of rows) {
    const list = grouped.get(row.ticketId) || [];
    list.push(toModel(row));
    grouped.set(row.ticketId, list);
  }
  return grouped;
};

export const insert = async (
  em: EntityManager,
  ticketId: string,
  c: PersistedComment,
): Promise<void> => {
  await em.insert(CommentEntity, { ...c, ticketId });
};

export const insertMany = async (
  em: EntityManager,
  rows: Array<PersistedComment & { ticketId: string }>,
): Promise<void> => {
  if (rows.length) await em.insert(CommentEntity, rows);
};

/** Returns true when a row was deleted. */
export const remove = async (em: EntityManager, ticketId: string, id: number): Promise<boolean> => {
  const r = await em.delete(CommentEntity, { ticketId, id });
  return (r.affected ?? 0) > 0;
};

export const removeByTicketIds = async (em: EntityManager, ticketIds: string[]): Promise<void> => {
  if (ticketIds.length) await em.delete(CommentEntity, { ticketId: In(ticketIds) });
};

export const clear = async (em: EntityManager): Promise<void> => {
  await em.clear(CommentEntity);
};
