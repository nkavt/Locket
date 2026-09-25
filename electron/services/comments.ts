import { mutate } from '../db/store';
import type { PersistedComment } from '../db/types';
import { NotFoundError, today } from './errors';

export const addComment = (
  ticketId: string,
  body: string,
  author: string,
): Promise<PersistedComment> =>
  mutate((data) => {
    const ticket = data.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    const comment: PersistedComment = {
      id: Date.now(),
      author,
      ts: new Date().toISOString(),
      body,
    };
    ticket.comments.push(comment);
    ticket.updated = today();
    return comment;
  });

export const deleteComment = (ticketId: string, commentId: number): Promise<void> =>
  mutate((data) => {
    const ticket = data.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    const idx = ticket.comments.findIndex((c) => c.id === commentId);
    if (idx === -1) throw new NotFoundError('Comment', String(commentId));
    ticket.comments.splice(idx, 1);
    ticket.updated = today();
  });
