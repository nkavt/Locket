import * as store from '../attachments/store';
import { repos, withTransaction } from '../db';
import type { NewAttachment, PersistedComment } from '../db/types';
import { validateAttachments } from './attachments';
import { NotFoundError, today } from './errors';

/** Millisecond timestamp, bumped past any existing id so two quick comments never collide. */
export const nextCommentId = (existing: PersistedComment[]): number =>
  Math.max(Date.now(), ...existing.map((c) => c.id + 1));

export const addComment = (
  ticketId: string,
  body: string,
  author: string,
  attachments: NewAttachment[] = [],
): Promise<PersistedComment> =>
  withTransaction(async (em) => {
    const ticket = await repos.tickets.findById(em, ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    const valid = await validateAttachments(ticketId, attachments);
    const comment: PersistedComment = {
      id: nextCommentId(ticket.comments),
      author,
      ts: new Date().toISOString(),
      body,
    };
    await repos.comments.insert(em, ticketId, comment);
    await repos.tickets.update(em, ticketId, { updated: today() });
    // Files last: if writing fails the transaction rolls back and the comment is not saved.
    comment.attachments = await store.write(ticketId, comment.id, valid);
    return comment;
  });

export const deleteComment = (ticketId: string, commentId: number): Promise<void> =>
  withTransaction(async (em) => {
    if (!(await repos.tickets.findById(em, ticketId))) throw new NotFoundError('Ticket', ticketId);
    if (!(await repos.comments.remove(em, ticketId, commentId))) {
      throw new NotFoundError('Comment', String(commentId));
    }
    await repos.tickets.update(em, ticketId, { updated: today() });
    await store.removeComment(ticketId, commentId);
  });
