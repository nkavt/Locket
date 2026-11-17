import { describe, expect, it, vi } from 'vitest';
import { ticketFixture, useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { createProject, deleteProject, getProject, listProjects, updateProject } =
  await import('./projects');
const { readSnapshot } = await import('./snapshot');
const { NotFoundError, ValidationError } = await import('./errors');

describe('projects service', () => {
  useTestDb();

  it('creates a project with defaults and a zeroed counter', async () => {
    const p = await createProject({ name: 'One', slug: 'one' });
    expect(p.id).toMatch(/^one-[a-z0-9]{4}$/);
    expect(p).toMatchObject({
      name: 'One',
      slug: 'one',
      icon: 'rocket_launch',
      color: '#1976d2',
      description: '# One\n\n',
    });
    const snap = await readSnapshot();
    expect(snap.projects).toEqual([p]);
    expect(snap.counters[p.id]).toBe(0);
  });

  it('rejects an invalid slug', async () => {
    await expect(createProject({ name: 'x', slug: 'Bad Slug' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect((await readSnapshot()).projects).toHaveLength(0);
  });

  it('rejects a duplicate slug', async () => {
    await createProject({ name: 'One', slug: 'one' });
    await expect(createProject({ name: 'Two', slug: 'one' })).rejects.toThrow(/already in use/);
  });

  it('lists projects in creation order with ticket counts', async () => {
    const a = await createProject({ name: 'A', slug: 'aa' });
    const b = await createProject({ name: 'B', slug: 'bb' });
    const { createTicket } = await import('./tickets');
    await createTicket({ projectId: a.id, title: 'x', author: 'me' });
    await createTicket({ projectId: a.id, title: 'y', author: 'me' });
    expect(await listProjects()).toEqual([
      { ...a, ticketCount: 2 },
      { ...b, ticketCount: 0 },
    ]);
  });

  it('gets a project or throws NotFoundError', async () => {
    const p = await createProject({ name: 'One', slug: 'one' });
    expect(await getProject(p.id)).toEqual(p);
    await expect(getProject('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates editable fields only', async () => {
    const p = await createProject({ name: 'One', slug: 'one' });
    const updated = await updateProject(p.id, { name: 'Renamed', color: '#000000' });
    expect(updated).toMatchObject({ name: 'Renamed', color: '#000000', slug: 'one' });
    expect(await getProject(p.id)).toEqual(updated);
    await expect(updateProject('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a project with its tickets, comments and counter', async () => {
    const { replaceSnapshot } = await import('./snapshot');
    await replaceSnapshot({
      projects: [
        { id: 'keep', name: 'Keep', slug: 'keep', icon: '', color: '', description: '' },
        { id: 'gone', name: 'Gone', slug: 'gone', icon: '', color: '', description: '' },
      ],
      tickets: [
        ticketFixture({ id: 'keep-1', projectId: 'keep' }),
        ticketFixture({
          id: 'gone-1',
          projectId: 'gone',
          comments: [{ id: 1, author: 'me', ts: '2026-01-01T00:00:00.000Z', body: 'hi' }],
        }),
        ticketFixture({ id: 'gone-2', projectId: 'gone' }),
      ],
      counters: { keep: 1, gone: 2 },
    });

    expect(await deleteProject('gone')).toEqual({ deletedTickets: 2 });
    const snap = await readSnapshot();
    expect(snap.projects.map((p) => p.id)).toEqual(['keep']);
    expect(snap.tickets.map((t) => t.id)).toEqual(['keep-1']);
    expect(snap.counters).toEqual({ keep: 1 });
    await expect(deleteProject('gone')).rejects.toBeInstanceOf(NotFoundError);
  });
  describe('archiving', () => {
    it('archives with a timestamp and unarchives back to null, keeping the row', async () => {
      const p = await createProject({ name: 'One', slug: 'one' });
      expect(p.archivedAt).toBeNull();

      const archived = await updateProject(p.id, { archived: true });
      expect(archived.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(await getProject(p.id)).toEqual(archived);

      const restored = await updateProject(p.id, { archived: false });
      expect(restored.archivedAt).toBeNull();
      expect((await readSnapshot()).projects).toEqual([restored]);
    });

    it('keeps the first archive time when archived again', async () => {
      const p = await createProject({ name: 'One', slug: 'one' });
      const first = await updateProject(p.id, { archived: true });
      await new Promise((r) => setTimeout(r, 5));
      const again = await updateProject(p.id, { archived: true, name: 'Renamed' });
      expect(again).toMatchObject({ name: 'Renamed', archivedAt: first.archivedAt });
    });

    it('lists active projects only unless archived ones are asked for', async () => {
      const a = await createProject({ name: 'A', slug: 'aa' });
      const b = await createProject({ name: 'B', slug: 'bb' });
      await updateProject(a.id, { archived: true });
      expect((await listProjects()).map((p) => p.id)).toEqual([b.id]);
      expect((await listProjects({ includeArchived: true })).map((p) => p.id)).toEqual([
        a.id,
        b.id,
      ]);
    });

    it('treats projects saved before archiving existed as active', async () => {
      const { replaceSnapshot } = await import('./snapshot');
      await replaceSnapshot({
        projects: [
          { id: 'old', name: 'Old', slug: 'old', icon: 'bolt', color: '#000000', description: '' },
        ],
        tickets: [],
        counters: { old: 0 },
      });
      expect(await getProject('old')).toMatchObject({ archivedAt: null });
      expect((await listProjects()).map((p) => p.id)).toEqual(['old']);
    });
  });
});
