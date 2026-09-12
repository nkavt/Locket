import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppStateStore } from './useAppStateStore';
import { INITIAL_DATA } from '@/data/constants';
import { makeProject } from '@/test/fixtures';
import type { Ticket } from '@/data/types';
import { installMockLocket } from '@/test/mockLocket';

const LS_KEY = 'locket-app-state-v1';

describe('useAppStateStore (browser mode)', () => {
  it('starts hydrated with the sample data', () => {
    const { result } = renderHook(() => useAppStateStore());
    expect(result.current.hydrated).toBe(true);
    expect(result.current.state.projects).toEqual(INITIAL_DATA.projects);
  });

  it('adds a project with a zeroed counter', () => {
    const { result } = renderHook(() => useAppStateStore());
    act(() => result.current.addProject(makeProject({ id: 'p9', slug: 'nine' })));
    expect(result.current.state.projects.at(-1)?.id).toBe('p9');
    expect(result.current.state.counters.p9).toBe(0);
  });

  it('numbers tickets per project from the slug', () => {
    const { result } = renderHook(() => useAppStateStore());
    act(() => result.current.addProject(makeProject({ id: 'p9', slug: 'nine' })));
    const out: { first?: Ticket | null; second?: Ticket | null } = {};
    act(() => {
      out.first = result.current.addTicket('p9', { title: 'One' });
    });
    act(() => {
      out.second = result.current.addTicket('p9', { title: 'Two' });
    });
    expect(out.first?.id).toBe('nine-1');
    expect(out.second?.id).toBe('nine-2');
    expect(result.current.state.counters.p9).toBe(2);
  });

  it('returns null when adding a ticket to an unknown project', () => {
    const { result } = renderHook(() => useAppStateStore());
    const out: { created?: Ticket | null } = {};
    act(() => {
      out.created = result.current.addTicket('nope', { title: 'x' });
    });
    expect(out.created).toBeNull();
  });

  it('deleting a project removes its tickets', () => {
    const { result } = renderHook(() => useAppStateStore());
    const project = result.current.state.projects[0];
    expect(result.current.state.tickets.some((t) => t.projectId === project.id)).toBe(true);
    act(() => result.current.deleteProject(project.id));
    expect(result.current.state.projects.find((p) => p.id === project.id)).toBeUndefined();
    expect(result.current.state.tickets.some((t) => t.projectId === project.id)).toBe(false);
  });

  it('updating a ticket bumps the updated date', () => {
    const { result } = renderHook(() => useAppStateStore());
    const ticket = result.current.state.tickets[0];
    act(() => result.current.updateTicket(ticket.id, { title: 'Renamed' }));
    const updated = result.current.state.tickets.find((t) => t.id === ticket.id)!;
    expect(updated.title).toBe('Renamed');
    expect(updated.updated).toBe(new Date().toISOString().slice(0, 10));
  });

  it('adds and deletes comments', () => {
    const { result } = renderHook(() => useAppStateStore());
    const ticket = result.current.state.tickets[0];
    const before = ticket.comments.length;
    act(() => result.current.addComment(ticket.id, 'hello', 'Sam'));
    let after = result.current.state.tickets.find((t) => t.id === ticket.id)!;
    expect(after.comments).toHaveLength(before + 1);
    expect(after.comments.at(-1)).toMatchObject({ body: 'hello', author: 'Sam' });
    const commentId = after.comments.at(-1)!.id;
    act(() => result.current.deleteComment(ticket.id, commentId));
    after = result.current.state.tickets.find((t) => t.id === ticket.id)!;
    expect(after.comments).toHaveLength(before);
  });

  it('persists to localStorage without settings', async () => {
    const { result } = renderHook(() => useAppStateStore());
    act(() => result.current.addProject(makeProject({ id: 'p9' })));
    await waitFor(() => {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      expect(raw.projects.some((p: { id: string }) => p.id === 'p9')).toBe(true);
      expect(raw.settings).toBeUndefined();
    });
  });

  it('loads persisted state from localStorage', () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        projects: [makeProject({ id: 'saved' })],
        tickets: [],
        counters: { saved: 0 },
      }),
    );
    const { result } = renderHook(() => useAppStateStore());
    expect(result.current.state.projects.map((p) => p.id)).toEqual(['saved']);
  });

  it('resetData restores the sample content', () => {
    const { result } = renderHook(() => useAppStateStore());
    act(() => result.current.deleteProject(result.current.state.projects[0].id));
    act(() => result.current.resetData());
    expect(result.current.state.projects).toEqual(INITIAL_DATA.projects);
  });
});

describe('useAppStateStore (electron mode)', () => {
  it('hydrates from the database and then persists to it', async () => {
    const mock = installMockLocket({
      data: { projects: [makeProject({ id: 'db' })], tickets: [], counters: { db: 0 } },
    });
    const { result } = renderHook(() => useAppStateStore());
    expect(result.current.hydrated).toBe(false);
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.state.projects.map((p) => p.id)).toEqual(['db']);

    act(() => result.current.addProject(makeProject({ id: 'p9' })));
    await waitFor(() => expect(mock.data?.projects.map((p) => p.id)).toEqual(['db', 'p9']));
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
