import type { EntityManager } from 'typeorm';
import * as store from '../attachments/store';
import { repos, withReader, withTransaction } from '../db';
import type { NewTicketInput, PersistedTicket, TicketFilter, TicketPatch } from '../db/types';
import { defaultStatus, matchStatus, resolveStatus } from '../workflows/rules';
import { validateAttachments } from './attachments';
import { NotFoundError, nowIso, ValidationError } from './errors';
import { workflowOfProject } from './workflows';

/**
 * Pure predicate for the parts of the filter that are not plain column matches. `status`
 * here is a status id; listTickets turns names into ids first.
 */
export const matchesFilter = (t: PersistedTicket, filter: TicketFilter): boolean => {
  const q = filter.query?.trim().toLowerCase();
  return (
    (!filter.projectId || t.projectId === filter.projectId) &&
    (!filter.status || t.status === filter.status) &&
    (!filter.priority || t.priority === filter.priority) &&
    (!filter.label || t.labels.includes(filter.label)) &&
    (!q ||
      t.title.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.labels.some((l) => l.toLowerCase().includes(q)))
  );
};

/**
 * Status ids a filter value stands for. With a project it must be one of that project's
 * statuses; without one, it matches every workflow's status with that id or name.
 */
const statusIdsFor = async (
  em: EntityManager,
  status: string,
  projectId: string | undefined,
): Promise<Set<string>> => {
  if (projectId) {
    const project = await repos.projects.findById(em, projectId);
    if (!project) throw new NotFoundError('Project', projectId);
    return new Set([resolveStatus(await workflowOfProject(em, project), status).id]);
  }
  const workflows = await repos.workflows.findAll(em);
  const ids = new Set(
    workflows.flatMap((w) => {
      const s = matchStatus(w, status);
      return s ? [s.id] : [];
    }),
  );
  if (!ids.size) {
    const known = [...new Set(workflows.flatMap((w) => w.statuses.map((s) => s.id)))];
    throw new ValidationError(`Unknown status "${status}". Known statuses: ${known.join(', ')}`);
  }
  return ids;
};

export const listTickets = (filter: TicketFilter = {}): Promise<PersistedTicket[]> =>
  withReader(async (em) => {
    const statuses = filter.status ? await statusIdsFor(em, filter.status, filter.projectId) : null;
    const rows = await repos.tickets.findAll(em, {
      projectId: filter.projectId,
      priority: filter.priority,
    });
    const rest = { ...filter, status: undefined };
    return rows.filter(
      (t) =>
        (!statuses || statuses.has(t.status)) &&
        (!(filter.label || filter.query) || matchesFilter(t, rest)),
    );
  });

export const getTicket = (id: string): Promise<PersistedTicket> =>
  withReader(async (em) => {
    const ticket = await repos.tickets.findById(em, id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    return ticket;
  });

export const createTicket = (input: NewTicketInput): Promise<PersistedTicket> =>
  withTransaction(async (em) => {
    const project = await repos.projects.findById(em, input.projectId);
    if (!project) throw new NotFoundError('Project', input.projectId);
    const workflow = await workflowOfProject(em, project);
    const status = input.status ? resolveStatus(workflow, input.status) : defaultStatus(workflow);
    const files = await validateAttachments(null, input.attachments);
    const next = await repos.counters.next(em, project.id);
    const now = nowIso();
    const ticket: PersistedTicket = {
      id: `${project.slug}-${next}`,
      projectId: project.id,
      title: input.title,
      description: input.description ?? '',
      status: status.id,
      priority: input.priority ?? 'medium',
      labels: input.labels ?? [],
      due: input.due ?? null,
      author: input.author,
      created: now,
      updated: now,
      comments: [],
    };
    await repos.tickets.insert(em, ticket);
    // Files last: if writing fails the transaction rolls back and the ticket is not created.
    ticket.attachments = await store.write(ticket.id, null, files);
    return ticket;
  });

export const updateTicket = (id: string, patch: TicketPatch): Promise<PersistedTicket> =>
  withTransaction(async (em) => {
    const ticket = await repos.tickets.findById(em, id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    const changes = { ...patch, updated: nowIso() };
    if (patch.status !== undefined) {
      const project = await repos.projects.findById(em, ticket.projectId);
      if (!project) throw new NotFoundError('Project', ticket.projectId);
      changes.status = resolveStatus(await workflowOfProject(em, project), patch.status).id;
    }
    await repos.tickets.update(em, id, changes);
    return { ...ticket, ...changes };
  });

export const deleteTicket = (id: string): Promise<void> =>
  withTransaction(async (em) => {
    if (!(await repos.tickets.findById(em, id))) throw new NotFoundError('Ticket', id);
    await repos.comments.removeByTicketIds(em, [id]);
    await repos.tickets.remove(em, id);
    await store.removeTickets([id]);
  });
