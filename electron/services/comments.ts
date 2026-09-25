import { repos, withTransaction } from '../db';
import type { PersistedComment } from '../db/types';
import { NotFoundError, today } from './errors';

/** Millisecond timestamp, bumped past any existing id so two quick comments never collide. */
export const nextCommentId = (existing: PersistedComment[]): number =>
  Math.max(Date.now(), ...existing.map((c) => c.id + 1));

export const addComment = (
  ticketId: string,
  body: string,
  author: string,
): Promise<PersistedComment> =>
  withTransaction(async (em) => {
    const ticket = await repos.tickets.findById(em, ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    const comment: PersistedComment = {
      id: nextCommentId(ticket.comments),
      author,
      ts: new Date().toISOString(),
      body,
    };
    await repos.comments.insert(em, ticketId, comment);
    await repos.tickets.update(em, ticketId, { updated: today() });
    return comment;
  });

export const deleteComment = (ticketId: string, commentId: number): Promise<void> =>
  withTransaction(async (em) => {
    if (!(await repos.tickets.findById(em, ticketId))) throw new NotFoundError('Ticket', ticketId);
    if (!(await repos.comments.remove(em, ticketId, commentId))) {
      throw new NotFoundError('Comment', String(commentId));
    }
    await repos.tickets.update(em, ticketId, { updated: today() });
  });
