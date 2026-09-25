import { mutate, readData } from '../db/store';
import type { NewTicketInput, PersistedTicket, TicketFilter, TicketPatch } from '../db/types';
import { NotFoundError, today } from './errors';

/** Pure predicate so the filter can be reused and tested without a store. */
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

export const listTickets = async (filter: TicketFilter = {}): Promise<PersistedTicket[]> => {
  const data = await readData();
  return data.tickets.filter((t) => matchesFilter(t, filter));
};

export const getTicket = async (id: string): Promise<PersistedTicket> => {
  const data = await readData();
  const ticket = data.tickets.find((t) => t.id === id);
  if (!ticket) throw new NotFoundError('Ticket', id);
  return ticket;
};

export const createTicket = (input: NewTicketInput): Promise<PersistedTicket> =>
  mutate((data) => {
    const project = data.projects.find((p) => p.id === input.projectId);
    if (!project) throw new NotFoundError('Project', input.projectId);
    const next = (data.counters[project.id] || 0) + 1;
    const now = today();
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
    data.tickets.push(ticket);
    data.counters[project.id] = next;
    return ticket;
  });

export const updateTicket = (id: string, patch: TicketPatch): Promise<PersistedTicket> =>
  mutate((data) => {
    const ticket = data.tickets.find((t) => t.id === id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    Object.assign(ticket, patch, { updated: today() });
    return ticket;
  });

export const deleteTicket = (id: string): Promise<void> =>
  mutate((data) => {
    const idx = data.tickets.findIndex((t) => t.id === id);
    if (idx === -1) throw new NotFoundError('Ticket', id);
    data.tickets.splice(idx, 1);
  });
