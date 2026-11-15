import * as store from '../attachments/store';
import { repos, withReader, withTransaction } from '../db';
import type { NewTicketInput, PersistedTicket, TicketFilter, TicketPatch } from '../db/types';
import { archivedProjectMessage, isArchived } from '../projects/archive';
import { validateAttachments } from './attachments';
import { NotFoundError, nowIso, ValidationError } from './errors';

/** Pure predicate for the parts of the filter that are not plain column matches. */
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
 * Tickets matching the filter. Without a projectId, tickets of archived projects are left out
 * unless `includeArchived` is set; naming a project always lists its tickets.
 */
export const listTickets = (filter: TicketFilter = {}): Promise<PersistedTicket[]> =>
  withReader(async (em) => {
    let rows = await repos.tickets.findAll(em, filter);
    if (filter.label || filter.query) rows = rows.filter((t) => matchesFilter(t, filter));
    if (filter.projectId || filter.includeArchived) return rows;
    const archived = new Set(
      (await repos.projects.findAll(em)).filter(isArchived).map((p) => p.id),
    );
    return archived.size ? rows.filter((t) => !archived.has(t.projectId)) : rows;
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
    // Existing tickets stay editable (to close loose ends); only new ones are refused.
    if (isArchived(project)) throw new ValidationError(archivedProjectMessage(project));
    const files = await validateAttachments(null, input.attachments);
    const next = await repos.counters.next(em, project.id);
    const now = nowIso();
    const ticket: PersistedTicket = {
      id: `${project.slug}-${next}`,
      projectId: project.id,
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'todo',
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
