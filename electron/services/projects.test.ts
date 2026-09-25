import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memory, resetMemory } from '../test/memory-store';

vi.mock('../db/store', () => import('../test/memory-store'));

const { createProject, deleteProject, getProject, listProjects, updateProject } =
  await import('./projects');
const { NotFoundError, ValidationError } = await import('./errors');

const ticket = (id: string, projectId: string) => ({
  id,
  projectId,
  title: id,
  description: '',
  status: 'todo',
  priority: 'medium',
  labels: [],
  due: null,
  author: 'me',
  created: '2026-01-01',
  updated: '2026-01-01',
  comments: [],
});

describe('projects service', () => {
  beforeEach(() => resetMemory());

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
    expect(memory.data.projects).toEqual([p]);
    expect(memory.data.counters[p.id]).toBe(0);
  });

  it('rejects an invalid slug', async () => {
    await expect(createProject({ name: 'x', slug: 'Bad Slug' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(memory.data.projects).toHaveLength(0);
  });

  it('rejects a duplicate slug', async () => {
    await createProject({ name: 'One', slug: 'one' });
    await expect(createProject({ name: 'Two', slug: 'one' })).rejects.toThrow(/already in use/);
  });

  it('lists projects with ticket counts', async () => {
    const p = await createProject({ name: 'One', slug: 'one' });
    memory.data.tickets.push(ticket('one-1', p.id), ticket('one-2', p.id));
    expect(await listProjects()).toEqual([{ ...p, ticketCount: 2 }]);
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
    expect(memory.data.projects[0]).toEqual(updated);
    await expect(updateProject('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a project with its tickets and counter', async () => {
    const keep = await createProject({ name: 'Keep', slug: 'keep' });
    const gone = await createProject({ name: 'Gone', slug: 'gone' });
    memory.data.tickets.push(
      ticket('keep-1', keep.id),
      ticket('gone-1', gone.id),
      ticket('gone-2', gone.id),
    );

    expect(await deleteProject(gone.id)).toEqual({ deletedTickets: 2 });
    expect(memory.data.projects.map((p) => p.id)).toEqual([keep.id]);
    expect(memory.data.tickets.map((t) => t.id)).toEqual(['keep-1']);
    expect(memory.data.counters).toEqual({ [keep.id]: 0 });
    await expect(deleteProject(gone.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
