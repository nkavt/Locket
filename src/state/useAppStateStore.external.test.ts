import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppStateStore } from './useAppStateStore';
import { makeProject, makeTicket } from '@/test/fixtures';
import { installMockLocket } from '@/test/mockLocket';

describe('useAppStateStore external changes', () => {
  it('adopts data pushed from the main process', async () => {
    const mock = installMockLocket({
      data: { projects: [makeProject({ id: 'db' })], tickets: [], counters: { db: 0 } },
    });
    const { result } = renderHook(() => useAppStateStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() =>
      mock.emitDataChanged({
        projects: [makeProject({ id: 'db' })],
        tickets: [makeTicket({ id: 'tst-9', projectId: 'db', title: 'From MCP' })],
        counters: { db: 1 },
      }),
    );
    expect(result.current.state.tickets.map((t) => t.title)).toEqual(['From MCP']);
    expect(result.current.state.counters.db).toBe(1);
  });

  it('does not duplicate a comment when the snapshot broadcast arrives before the call resolves', async () => {
    const mock = installMockLocket({
      data: {
        projects: [makeProject({ id: 'db' })],
        tickets: [makeTicket({ id: 'tst-1', projectId: 'db' })],
        counters: { db: 1 },
      },
    });
    // Mirror the main process: every mutation broadcasts the fresh snapshot
    // to all windows (including the caller) before the IPC call returns.
    const add = mock.bridge.comments.add;
    mock.bridge.comments.add = async (...args) => {
      const comment = await add(...args);
      mock.emitDataChanged(structuredClone(mock.data!));
      return comment;
    };
    const { result } = renderHook(() => useAppStateStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(() => result.current.addComment('tst-1', 'hello', 'Sam'));
    const ticket = result.current.state.tickets.find((t) => t.id === 'tst-1')!;
    expect(ticket.comments).toHaveLength(1);
    expect(ticket.comments[0]).toMatchObject({ body: 'hello', author: 'Sam' });
  });
});
