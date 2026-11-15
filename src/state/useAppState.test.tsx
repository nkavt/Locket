import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useProjectTickets } from './useAppState';
import { AppProviders } from '@/app/AppProviders';
import { makeProject, makeTicket, seedLocalWorkspace } from '@/test/fixtures';

const wrapper = ({ children }: { children: ReactNode }) => <AppProviders>{children}</AppProviders>;

describe('useProjectTickets', () => {
  it('sorts newest first when old date-only and new full timestamps are mixed', async () => {
    const project = makeProject();
    seedLocalWorkspace({
      projects: [project],
      tickets: [
        makeTicket({ id: 'tst-1', created: '2026-11-10' }),
        makeTicket({ id: 'tst-2', created: '2026-11-12' }),
        makeTicket({ id: 'tst-3', created: '2026-11-12T09:30:00.000Z' }),
        makeTicket({ id: 'tst-4', created: '2026-11-11T23:00:00.000Z' }),
        makeTicket({ id: 'tst-5', created: '2026-11-13T08:00:00.000Z' }),
      ],
      counters: { [project.id]: 5 },
    });

    const { result } = renderHook(() => useProjectTickets(project.id), { wrapper });

    await waitFor(() => expect(result.current).toHaveLength(5));
    // A date-only value sorts as the start of its day, so it comes after timestamps from that day.
    expect(result.current.map((t) => t.id)).toEqual(['tst-5', 'tst-3', 'tst-2', 'tst-4', 'tst-1']);
  });
});
