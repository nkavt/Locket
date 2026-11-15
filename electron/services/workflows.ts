import type { EntityManager } from 'typeorm';
import { repos, withReader, withTransaction } from '../db';
import type { PersistedProject, PersistedTicket } from '../db/types';
import {
  buildWorkflow,
  DEFAULT_WORKFLOW_ID,
  findStatus,
  planWorkflowUpdate,
  type NewWorkflowInput,
  type PersistedStatus,
  type PersistedWorkflow,
  type WorkflowPatch,
} from '../workflows/rules';
import { NotFoundError, ValidationError } from './errors';

export interface WorkflowSummary extends PersistedWorkflow {
  /** Projects using it. A workflow can only be deleted when this is empty. */
  projectIds: string[];
  /** Tickets per status id, across every project using it. */
  ticketCounts: Record<string, number>;
}

export interface NewWorkflowRequest extends NewWorkflowInput {
  /** Copy the statuses of this workflow (with new ids) instead of the default ones. */
  copyFrom?: string;
}

const summarize = (
  w: PersistedWorkflow,
  projects: PersistedProject[],
  counts: Record<string, number>,
): WorkflowSummary => ({
  ...w,
  projectIds: projects.filter((p) => p.workflowId === w.id).map((p) => p.id),
  ticketCounts: Object.fromEntries(w.statuses.map((s) => [s.id, counts[s.id] ?? 0])),
});

const load = async (em: EntityManager, id: string): Promise<PersistedWorkflow> => {
  const workflow = await repos.workflows.findById(em, id);
  if (!workflow) throw new NotFoundError('Workflow', id);
  return workflow;
};

const loadSummary = async (em: EntityManager, id: string): Promise<WorkflowSummary> => {
  const [workflow, projects, counts] = await Promise.all([
    load(em, id),
    repos.projects.findAll(em),
    repos.tickets.countByStatus(em),
  ]);
  return summarize(workflow, projects, counts);
};

/** The workflow a project uses. Must run inside a reader or transaction. */
export const workflowOfProject = async (
  em: EntityManager,
  project: PersistedProject,
): Promise<PersistedWorkflow> =>
  (await repos.workflows.findById(em, project.workflowId)) ?? (await load(em, DEFAULT_WORKFLOW_ID));

/** The stored status a ticket is in, for showing its name. */
export const statusOfTicket = (ticket: PersistedTicket): Promise<PersistedStatus | undefined> =>
  withReader(async (em) => {
    const project = await repos.projects.findById(em, ticket.projectId);
    return project ? findStatus(await workflowOfProject(em, project), ticket.status) : undefined;
  });

export const listWorkflows = (): Promise<WorkflowSummary[]> =>
  withReader(async (em) => {
    const [workflows, projects, counts] = await Promise.all([
      repos.workflows.findAll(em),
      repos.projects.findAll(em),
      repos.tickets.countByStatus(em),
    ]);
    return workflows.map((w) => summarize(w, projects, counts));
  });

export const getWorkflow = (id: string): Promise<WorkflowSummary> =>
  withReader((em) => loadSummary(em, id));

/** A new workflow, or a copy of `copyFrom` that can then change without touching the original. */
export const createWorkflow = (input: NewWorkflowRequest): Promise<WorkflowSummary> =>
  withTransaction(async (em) => {
    const source = input.copyFrom ? await load(em, input.copyFrom) : null;
    const workflow = buildWorkflow(
      { name: input.name, statuses: input.statuses ?? source?.statuses },
      await repos.workflows.workflowIds(em),
      await repos.workflows.statusIds(em),
    );
    await repos.workflows.insert(em, workflow);
    return { ...workflow, projectIds: [], ticketCounts: {} };
  });

/**
 * Rename a workflow and/or replace its status list. Every project using it sees the change.
 * Deleting a status that tickets still use needs `moves` saying where those tickets go.
 */
export const updateWorkflow = (id: string, patch: WorkflowPatch): Promise<WorkflowSummary> =>
  withTransaction(async (em) => {
    const current = await load(em, id);
    const projectIds = (await repos.projects.findByWorkflow(em, id)).map((p) => p.id);
    const counts = await repos.tickets.countByStatus(em, projectIds);
    const own = new Set(current.statuses.map((s) => s.id));
    const taken = new Set([...(await repos.workflows.statusIds(em))].filter((s) => !own.has(s)));
    const { workflow, moves } = planWorkflowUpdate(current, patch, counts, taken);
    await repos.tickets.moveStatuses(em, projectIds, moves);
    await repos.workflows.save(em, workflow);
    return loadSummary(em, id);
  });

/** Only unused workflows can go, and never the default one new projects fall back to. */
export const deleteWorkflow = (id: string): Promise<void> =>
  withTransaction(async (em) => {
    const workflow = await load(em, id);
    if (id === DEFAULT_WORKFLOW_ID) {
      throw new ValidationError('The default workflow cannot be deleted');
    }
    const users = await repos.projects.findByWorkflow(em, id);
    if (users.length) {
      throw new ValidationError(
        `Workflow "${workflow.name}" is used by ${users.map((p) => p.id).join(', ')}. ` +
          'Move those projects to another workflow first.',
      );
    }
    await repos.workflows.remove(em, id);
  });
