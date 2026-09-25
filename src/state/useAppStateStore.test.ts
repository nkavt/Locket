import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppStateStore } from './useAppStateStore';
import { INITIAL_DATA } from '@/data/constants';
import { makeProject } from '@/test/fixtures';
import { installMockLocket } from '@/test/mockLocket';

const LS_KEY = 'locket-app-state-v1';

async function renderStore() {
  const hook = renderHook(() => useAppStateStore());
  await waitFor(() => expect(hook.result.current.hydrated).toBe(true));
  return hook;
}

describe('useAppStateStore (browser mode)', () => {
  it('seeds the sample data on first run and persists it', async () => {
    const { result } = await renderStore();
    expect(result.current.state.projects).toEqual(INITIAL_DATA.projects);
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    expect(raw.projects).toHaveLength(INITIAL_DATA.projects.length);
    expect(raw.settings).toBeUndefined();
  });

  it('adds a project with a generated id and a zeroed counter', async () => {
    const { result } = await renderStore();
    let created: Awaited<ReturnType<typeof result.current.addProject>> | undefined;
    await act(async () => {
      created = await result.current.addProject({ name: 'Nine', slug: 'nine' });
    });
    expect(created?.id).toMatch(/^nine-/);
    expect(result.current.state.projects.at(-1)?.slug).toBe('nine');
    expect(result.current.state.counters[created!.id]).toBe(0);
  });

  it('rejects a duplicate slug', async () => {
    const { result } = await renderStore();
    const existing = result.current.state.projects[0];
    await expect(result.current.addProject({ name: 'Dup', slug: existing.slug })).rejects.toThrow(
      /already in use/,
    );
  });

  it('numbers tickets per project from the slug', async () => {
    const { result } = await renderStore();
    let projectId = '';
    await act(async () => {
      projectId = (await result.current.addProject({ name: 'Nine', slug: 'nine' })).id;
    });
    const ids: string[] = [];
    await act(async () => {
      ids.push((await result.current.addTicket(projectId, { title: 'One' })).id);
    });
    await act(async () => {
      ids.push((await result.current.addTicket(projectId, { title: 'Two' })).id);
    });
    expect(ids).toEqual(['nine-1', 'nine-2']);
    expect(result.current.state.counters[projectId]).toBe(2);
    expect(result.current.state.tickets.filter((t) => t.projectId === projectId)).toHaveLength(2);
  });

  it('rejects adding a ticket to an unknown project', async () => {
    const { result } = await renderStore();
    await expect(result.current.addTicket('nope', { title: 'x' })).rejects.toThrow(/not found/);
  });

  it('deleting a project removes its tickets and counter', async () => {
    const { result } = await renderStore();
    const project = result.current.state.projects[0];
    expect(result.current.state.tickets.some((t) => t.projectId === project.id)).toBe(true);
    await act(() => result.current.deleteProject(project.id));
    expect(result.current.state.projects.find((p) => p.id === project.id)).toBeUndefined();
    expect(result.current.state.tickets.some((t) => t.projectId === project.id)).toBe(false);
    expect(project.id in result.current.state.counters).toBe(false);
  });

  it('updating a ticket bumps the updated date', async () => {
    const { result } = await renderStore();
    const ticket = result.current.state.tickets[0];
    await act(() => result.current.updateTicket(ticket.id, { title: 'Renamed' }));
    const updated = result.current.state.tickets.find((t) => t.id === ticket.id)!;
    expect(updated.title).toBe('Renamed');
    expect(updated.updated).toBe(new Date().toISOString().slice(0, 10));
  });

  it('adds and deletes comments', async () => {
    const { result } = await renderStore();
    const ticket = result.current.state.tickets[0];
    const before = ticket.comments.length;
    await act(() => result.current.addComment(ticket.id, 'hello', 'Sam'));
    let after = result.current.state.tickets.find((t) => t.id === ticket.id)!;
    expect(after.comments).toHaveLength(before + 1);
    expect(after.comments.at(-1)).toMatchObject({ body: 'hello', author: 'Sam' });
    const commentId = after.comments.at(-1)!.id;
    await act(() => result.current.deleteComment(ticket.id, commentId));
    after = result.current.state.tickets.find((t) => t.id === ticket.id)!;
    expect(after.comments).toHaveLength(before);
  });

  it('persists every change to localStorage', async () => {
    const { result } = await renderStore();
    await act(async () => {
      await result.current.addProject({ name: 'Nine', slug: 'nine' });
    });
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    expect(raw.projects.some((p: { slug: string }) => p.slug === 'nine')).toBe(true);
  });

  it('loads persisted state from localStorage', async () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        projects: [makeProject({ id: 'saved' })],
        tickets: [],
        counters: { saved: 0 },
      }),
    );
    const { result } = await renderStore();
    expect(result.current.state.projects.map((p) => p.id)).toEqual(['saved']);
  });

  it('resetData restores the sample content', async () => {
    const { result } = await renderStore();
    await act(() => result.current.deleteProject(result.current.state.projects[0].id));
    await act(() => result.current.resetData());
    expect(result.current.state.projects).toEqual(INITIAL_DATA.projects);
  });
});

describe('useAppStateStore (electron mode)', () => {
  it('hydrates from the database and writes through the bridge', async () => {
    const mock = installMockLocket({
      data: { projects: [makeProject({ id: 'db', slug: 'db' })], tickets: [], counters: { db: 0 } },
    });
    const hook = renderHook(() => useAppStateStore());
    expect(hook.result.current.hydrated).toBe(false);
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true));
    expect(hook.result.current.state.projects.map((p) => p.id)).toEqual(['db']);

    await act(async () => {
      await hook.result.current.addProject({ name: 'Nine', slug: 'nine' });
    });
    expect(mock.data?.projects.map((p) => p.slug)).toEqual(['db', 'nine']);
    expect(hook.result.current.state.projects.map((p) => p.slug)).toEqual(['db', 'nine']);
  });

  it('seeds the database on first run from legacy localStorage', async () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ projects: [makeProject({ id: 'legacy' })], tickets: [], counters: {} }),
    );
    const mock = installMockLocket({ data: null });
    const { result } = await renderStore();
    expect(mock.data?.projects.map((p) => p.id)).toEqual(['legacy']);
    expect(result.current.state.projects.map((p) => p.id)).toEqual(['legacy']);
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it('seeds the database with samples when nothing exists', async () => {
    const mock = installMockLocket({ data: null });
    await renderStore();
    expect(mock.data?.projects).toEqual(INITIAL_DATA.projects);
  });

  it('merges persisted settings and writes only persisted keys back', async () => {
    const mock = installMockLocket({ settings: { mcpPort: 9000, workspacePath: '/w' } });
    const { result } = renderHook(() => useAppStateStore());
    await waitFor(() => expect(result.current.state.settings.mcpPort).toBe(9000));

    act(() => result.current.setSettings({ mcpRunning: true, mcpPort: 9001 }));
    await waitFor(() => expect(mock.settings.mcpPort).toBe(9001));
    expect(result.current.state.settings.mcpRunning).toBe(true);
    expect('mcpRunning' in mock.settings).toBe(false);
  });
});
