import { useContext, useMemo } from 'react';
import { AppStateContext } from './AppStateContext';
import type { AppStateApi } from './useAppStateStore';
import type { Project, Ticket } from '@/data/types';
import { workflowOf, type Workflow } from '@/data/workflows';

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

export function useWorkflows(): Workflow[] {
  return useAppState().state.workflows;
}

/** The workflow whose statuses a project's tickets use. */
export function useProjectWorkflow(project: Pick<Project, 'workflowId'> | undefined): Workflow {
  const workflows = useWorkflows();
  return workflowOf(workflows, project?.workflowId);
}

export interface WorkflowUsage {
  /** Projects using the workflow; it can only be deleted when there are none. */
  projectIds: string[];
  /** Tickets per status id, across those projects. */
  ticketCounts: Record<string, number>;
}

/** Map of workflowId → who uses it, for the workflow settings. */
export function useWorkflowUsage(): Record<string, WorkflowUsage> {
  const { workflows, projects, tickets } = useAppState().state;
  return useMemo(() => {
    const usage: Record<string, WorkflowUsage> = {};
    for (const w of workflows) usage[w.id] = { projectIds: [], ticketCounts: {} };
    const projectWorkflow = new Map<string, string>();
    for (const p of projects) {
      const id = workflowOf(workflows, p.workflowId)?.id;
      if (!id) continue;
      projectWorkflow.set(p.id, id);
      usage[id].projectIds.push(p.id);
    }
    for (const t of tickets) {
      const id = projectWorkflow.get(t.projectId);
      if (!id) continue;
      const counts = usage[id].ticketCounts;
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return usage;
  }, [workflows, projects, tickets]);
}
