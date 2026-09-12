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
});
