// Shared with the renderer: keep free of Node and DOM APIs.
import type { PersistedProject, PersistedTicket } from '../db/types';
import {
  DEFAULT_WORKFLOW_ID,
  defaultStatus,
  defaultWorkflow,
  findStatus,
  type PersistedWorkflow,
} from './rules';

type LooseProject = Omit<PersistedProject, 'workflowId'> & { workflowId?: string };

/** A workspace payload as any version wrote it: older ones lack workflows and workflowId. */
export interface LoosePersistedData<
  P extends LooseProject = LooseProject,
  T extends Pick<PersistedTicket, 'projectId' | 'status'> = PersistedTicket,
> {
  workflows?: PersistedWorkflow[];
  projects?: P[];
  tickets?: T[];
  counters?: Record<string, number>;
}

/**
 * Make a payload consistent: the default workflow exists, every project points at a known
 * workflow, and every ticket's status belongs to its project's workflow (unknown ones go to
 * the workflow's first `todo` status). Data from before workflows comes through unchanged
 * apart from gaining the default workflow, since its statuses keep their old ids.
 */
export const normalizeData = <
  P extends LooseProject,
  T extends Pick<PersistedTicket, 'projectId' | 'status'>,
>(
  data: LoosePersistedData<P, T>,
) => {
  const workflows = [...(data.workflows ?? [])].filter((w) => w.statuses?.length);
  if (!workflows.some((w) => w.id === DEFAULT_WORKFLOW_ID)) workflows.unshift(defaultWorkflow());
  const byId = new Map(workflows.map((w) => [w.id, w]));

  const projects = (data.projects ?? []).map((p) => ({
    ...p,
    workflowId: p.workflowId && byId.has(p.workflowId) ? p.workflowId : DEFAULT_WORKFLOW_ID,
  }));
  const workflowOf = new Map(projects.map((p) => [p.id, byId.get(p.workflowId)!]));

  const tickets = (data.tickets ?? []).map((t) => {
    const workflow = workflowOf.get(t.projectId) ?? byId.get(DEFAULT_WORKFLOW_ID)!;
    return findStatus(workflow, t.status) ? t : { ...t, status: defaultStatus(workflow).id };
  });

  return { workflows, projects, tickets, counters: data.counters ?? {} };
};
