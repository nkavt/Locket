import { describe, expect, it, vi } from 'vitest';
import { ticketFixture, useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { addComment, deleteComment } = await import('./comments');
const { getTicket } = await import('./tickets');
const { NotFoundError } = await import('./errors');

const TODAY = new Date().toISOString().slice(0, 10);

describe('comments service', () => {
  useTestDb(() => ({
    projects: [{ id: 'p1', name: 'One', slug: 'one', icon: '', color: '', description: '' }],
    tickets: [ticketFixture({ id: 'one-1', updated: '2000-01-01' })],
    counters: { p1: 1 },
  }));

  it('appends a comment and bumps the ticket', async () => {
    const c = await addComment('one-1', 'Hello', 'me');
    expect(c).toMatchObject({ body: 'Hello', author: 'me' });
    expect(typeof c.id).toBe('number');
    expect(Number.isNaN(Date.parse(c.ts))).toBe(false);
    const ticket = await getTicket('one-1');
    expect(ticket.comments).toEqual([c]);
    expect(ticket.updated).toBe(TODAY);
  });

  it('keeps comments in time order with distinct ids even within one millisecond', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const a = await addComment('one-1', 'first', 'me');
      const b = await addComment('one-1', 'second', 'me');
      const c = await addComment('one-1', 'third', 'me');
      expect([a.id, b.id, c.id]).toEqual([now, now + 1, now + 2]);
    } finally {
      vi.restoreAllMocks();
    }
    expect((await getTicket('one-1')).comments.map((c) => c.body)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('rejects comments on unknown tickets', async () => {
    await expect(addComment('nope', 'x', 'me')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a comment by id', async () => {
    const c = await addComment('one-1', 'Hello', 'me');
    await deleteComment('one-1', c.id);
    expect((await getTicket('one-1')).comments).toEqual([]);
    await expect(deleteComment('one-1', c.id)).rejects.toThrow(/Comment/);
    await expect(deleteComment('nope', c.id)).rejects.toThrow(/Ticket/);
  });
});
