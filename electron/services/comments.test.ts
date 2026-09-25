import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memory, resetMemory } from '../test/memory-store';

vi.mock('../db/store', () => import('../test/memory-store'));

const { addComment, deleteComment } = await import('./comments');
const { NotFoundError } = await import('./errors');

const TODAY = new Date().toISOString().slice(0, 10);

describe('comments service', () => {
  beforeEach(() =>
    resetMemory({
      projects: [],
      tickets: [
        {
          id: 'one-1',
          projectId: 'p1',
          title: 'A',
          description: '',
          status: 'todo',
          priority: 'medium',
          labels: [],
          due: null,
          author: 'me',
          created: '2000-01-01',
          updated: '2000-01-01',
          comments: [],
        },
      ],
      counters: {},
    }),
  );

  it('appends a comment and bumps the ticket', async () => {
    const c = await addComment('one-1', 'Hello', 'me');
    expect(c).toMatchObject({ body: 'Hello', author: 'me' });
    expect(typeof c.id).toBe('number');
    expect(Number.isNaN(Date.parse(c.ts))).toBe(false);
    expect(memory.data.tickets[0].comments).toEqual([c]);
    expect(memory.data.tickets[0].updated).toBe(TODAY);
  });

  it('rejects comments on unknown tickets', async () => {
    await expect(addComment('nope', 'x', 'me')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a comment by id', async () => {
    const c = await addComment('one-1', 'Hello', 'me');
    await deleteComment('one-1', c.id);
    expect(memory.data.tickets[0].comments).toEqual([]);
    await expect(deleteComment('one-1', c.id)).rejects.toThrow(/Comment/);
    await expect(deleteComment('nope', c.id)).rejects.toThrow(/Ticket/);
  });
});
