import { describe, expect, it, vi } from 'vitest';
import type { PersistedData } from '../db/types';
import { ticketFixture, useTestDb } from '../test/db';

type Handler = (event: unknown, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();

vi.mock('electron', () => ({
  app: { getVersion: () => '0.0.0-test' },
  ipcMain: { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) },
}));

const { registerDataIpc } = await import('./data');

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => {
  const fn = handlers.get(channel);
  if (!fn) throw new Error(`No handler for ${channel}`);
  return fn({}, ...args) as Promise<T>;
};

describe('data IPC', () => {
  useTestDb(() => ({
    projects: [{ id: 'p1', name: 'One', slug: 'one', icon: '', color: '', description: '' }],
    tickets: [ticketFixture({ id: 'one-1' })],
    counters: { p1: 1 },
  }));

  const notify = vi.fn<(data: PersistedData) => void>();
  registerDataIpc(notify);

  it('registers every channel the preload exposes', () => {
    expect([...handlers.keys()].sort()).toEqual(
      [
        'comments:add',
        'comments:delete',
        'data:get',
        'data:replace',
        'projects:create',
        'projects:delete',
        'projects:list',
        'projects:update',
        'tickets:create',
        'tickets:delete',
        'tickets:get',
        'tickets:list',
        'tickets:update',
      ].sort(),
    );
  });

  it('serves the snapshot and per-entity reads without notifying', async () => {
    notify.mockClear();
    const snap = await invoke<PersistedData>('data:get');
    expect(snap?.tickets.map((t) => t.id)).toEqual(['one-1']);
    expect(await invoke<Array<{ ticketCount: number }>>('projects:list')).toMatchObject([
      { id: 'p1', ticketCount: 1 },
    ]);
    expect(await invoke<{ id: string }>('tickets:get', 'one-1')).toMatchObject({ id: 'one-1' });
    expect(await invoke<unknown[]>('tickets:list', { status: 'done' })).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });

  it('runs mutations through the services and broadcasts the fresh snapshot', async () => {
    notify.mockClear();
    const ticket = await invoke<{ id: string }>('tickets:create', {
      projectId: 'p1',
      title: 'New',
      author: 'me',
    });
    expect(ticket.id).toBe('one-2');
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].tickets.map((t) => t.id)).toEqual(['one-1', 'one-2']);

    await invoke('comments:add', 'one-2', 'hi', 'me');
    await invoke('tickets:update', 'one-2', { status: 'done' });
    await invoke('tickets:delete', 'one-2');
    await invoke('projects:update', 'p1', { name: 'Uno' });
    expect(notify).toHaveBeenCalledTimes(5);
    expect(notify.mock.lastCall?.[0]).toMatchObject({
      projects: [{ id: 'p1', name: 'Uno' }],
      tickets: [{ id: 'one-1' }],
    });
  });

  it('rejects with the service error for bad input', async () => {
    await expect(invoke('tickets:get', 'nope')).rejects.toThrow(/not found/);
    await expect(invoke('projects:create', { name: 'x', slug: 'one' })).rejects.toThrow(
      /already in use/,
    );
  });

  it('replaces the whole workspace and notifies', async () => {
    notify.mockClear();
    await invoke('data:replace', { projects: [], tickets: [], counters: {} });
    expect(notify).toHaveBeenCalledWith({ projects: [], tickets: [], counters: {} });
    await invoke('projects:delete', 'p1').catch(() => undefined);
  });
});
