import { useContext, useMemo } from 'react';
import { AppStateContext } from './AppStateContext';
import type { AppStateApi } from './useAppStateStore';
import type { Project, Ticket } from '@/data/types';

/** Full state API: data plus every mutation. */
export function useAppState(): AppStateApi {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export function useProjects(): Project[] {
  return useAppState().state.projects;
}

export function useProject(id: string | undefined): Project | undefined {
  const projects = useProjects();
  return id ? projects.find((p) => p.id === id) : undefined;
}

/** Tickets of one project, newest first. */
export function useProjectTickets(projectId: string | undefined): Ticket[] {
  const { tickets } = useAppState().state;
  return useMemo(
    () =>
      tickets
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => b.created.localeCompare(a.created)),
    [tickets, projectId],
  );
}

export function useTicket(id: string | undefined): Ticket | undefined {
  const { tickets } = useAppState().state;
  return id ? tickets.find((t) => t.id === id) : undefined;
}

/** Map of projectId → number of tickets. */
export function useTicketCounts(): Record<string, number> {
  const { tickets } = useAppState().state;
  return useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach((t) => {
      m[t.projectId] = (m[t.projectId] || 0) + 1;
    });
    return m;
  }, [tickets]);
}
