import { describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { createTicket, deleteTicket, getTicket, listTickets, matchesFilter, updateTicket } =
  await import('./tickets');
const { readSnapshot } = await import('./snapshot');
const { NotFoundError } = await import('./errors');

const PROJECT = { id: 'p1', name: 'One', slug: 'one', icon: '', color: '', description: '' };
const TODAY = new Date().toISOString().slice(0, 10);

describe('tickets service', () => {
  useTestDb(() => ({
    projects: [PROJECT, { ...PROJECT, id: 'p2', slug: 'two' }],
    tickets: [],
    counters: { p1: 0, p2: 0 },
  }));

  it('creates tickets with sequential slug-based ids and defaults', async () => {
    const a = await createTicket({ projectId: 'p1', title: 'A', author: 'me' });
    const b = await createTicket({ projectId: 'p1', title: 'B', author: 'me', priority: 'high' });
    expect(a).toMatchObject({
      id: 'one-1',
      status: 'todo',
      priority: 'medium',
      labels: [],
      due: null,
      description: '',
      created: TODAY,
      updated: TODAY,
      comments: [],
    });
    expect(b).toMatchObject({ id: 'one-2', priority: 'high' });
    expect((await readSnapshot()).counters.p1).toBe(2);
  });

  it('keeps ids unique after a delete', async () => {
    await createTicket({ projectId: 'p1', title: 'A', author: 'me' });
    await deleteTicket('one-1');
    const next = await createTicket({ projectId: 'p1', title: 'B', author: 'me' });
    expect(next.id).toBe('one-2');
  });

  it('refuses to create in an unknown project', async () => {
    await expect(
      createTicket({ projectId: 'nope', title: 'A', author: 'me' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('gets a ticket with its comments or throws', async () => {
    const t = await createTicket({ projectId: 'p1', title: 'A', author: 'me' });
    expect(await getTicket('one-1')).toEqual(t);
    await expect(getTicket('one-9')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates only the given fields and bumps updated', async () => {
    await createTicket({ projectId: 'p1', title: 'A', author: 'me', labels: ['a'] });
    const t = await updateTicket('one-1', { status: 'done', due: '2026-12-31' });
    expect(t).toMatchObject({
      title: 'A',
      labels: ['a'],
      status: 'done',
      due: '2026-12-31',
      updated: TODAY,
    });
    expect(await getTicket('one-1')).toEqual(t);
    await expect(updateTicket('one-9', {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a ticket or throws', async () => {
    await createTicket({ projectId: 'p1', title: 'A', author: 'me' });
    await deleteTicket('one-1');
    expect((await readSnapshot()).tickets).toHaveLength(0);
    await expect(deleteTicket('one-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('listTickets / matchesFilter', () => {
    const seed = async () => {
      await createTicket({ projectId: 'p1', title: 'Fix login', author: 'me', labels: ['bug'] });
      await createTicket({
        projectId: 'p1',
        title: 'Write docs',
        author: 'me',
        status: 'done',
        priority: 'low',
      });
      await createTicket({ projectId: 'p2', title: 'Ship it', author: 'me', labels: ['Release'] });
    };
    const ids = async (filter = {}) => (await listTickets(filter)).map((t) => t.id);

    it('returns everything in creation order without a filter', async () => {
      await seed();
      expect(await ids()).toEqual(['one-1', 'one-2', 'two-1']);
    });

    it('filters by project, status, priority and label', async () => {
      await seed();
      expect(await ids({ projectId: 'p2' })).toEqual(['two-1']);
      expect(await ids({ status: 'done' })).toEqual(['one-2']);
      expect(await ids({ priority: 'low' })).toEqual(['one-2']);
      expect(await ids({ label: 'bug' })).toEqual(['one-1']);
    });

    it('matches the query against title, id and labels, case-insensitively', async () => {
      await seed();
      expect(await ids({ query: 'LOGIN' })).toEqual(['one-1']);
      expect(await ids({ query: 'two-' })).toEqual(['two-1']);
      expect(await ids({ query: 'release' })).toEqual(['two-1']);
      expect(await ids({ query: '  ' })).toHaveLength(3);
    });

    it('combines filters with AND', async () => {
      await seed();
      expect(await ids({ projectId: 'p1', status: 'todo' })).toEqual(['one-1']);
      const [first] = await listTickets();
      expect(matchesFilter(first, { projectId: 'p1', status: 'done' })).toBe(false);
    });
  });
});
