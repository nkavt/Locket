import type { Comment, Project, Ticket } from '@/data/types';
import type {
  NewProjectInput,
  NewTicketInput,
  PersistedData,
  ProjectPatch,
  TicketPatch,
} from '@/types/electron-api';

const today = () => new Date().toISOString().slice(0, 10);

// --- reducers: apply an already-decided change to a dataset -----------------

export const withProject = (d: PersistedData, project: Project): PersistedData => {
  const exists = d.projects.some((p) => p.id === project.id);
  return {
    ...d,
    projects: exists
      ? d.projects.map((p) => (p.id === project.id ? project : p))
      : [...d.projects, project],
    counters: exists ? d.counters : { ...d.counters, [project.id]: 0 },
  };
};

export const withoutProject = (d: PersistedData, id: string): PersistedData => {
  const counters = { ...d.counters };
  delete counters[id];
  return {
    projects: d.projects.filter((p) => p.id !== id),
    tickets: d.tickets.filter((t) => t.projectId !== id),
    counters,
  };
};

export const withTicket = (d: PersistedData, ticket: Ticket): PersistedData => ({
  ...d,
  tickets: d.tickets.some((t) => t.id === ticket.id)
    ? d.tickets.map((t) => (t.id === ticket.id ? ticket : t))
    : [...d.tickets, ticket],
});

export const withoutTicket = (d: PersistedData, id: string): PersistedData => ({
  ...d,
  tickets: d.tickets.filter((t) => t.id !== id),
});

export const withComment = (
  d: PersistedData,
  ticketId: string,
  comment: Comment,
): PersistedData => ({
  ...d,
  tickets: d.tickets.map((t) => {
    if (t.id !== ticketId) return t;
    // The Electron bridge broadcasts the fresh snapshot before the call resolves,
    // so the comment may already be present: replace it instead of appending twice.
    const exists = t.comments.some((c) => c.id === comment.id);
    return {
      ...t,
      comments: exists
        ? t.comments.map((c) => (c.id === comment.id ? comment : c))
        : [...t.comments, comment],
      updated: today(),
    };
  }),
});

export const withoutComment = (
  d: PersistedData,
  ticketId: string,
  commentId: number,
): PersistedData => ({
  ...d,
  tickets: d.tickets.map((t) =>
    t.id === ticketId ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) } : t,
  ),
});

// --- operations: decide the change too (browser fallback, mirrors electron/services) ---

export function createProject(d: PersistedData, input: NewProjectInput) {
  if (d.projects.some((p) => p.slug === input.slug)) {
    throw new Error(`Slug "${input.slug}" already in use`);
  }
  const project: Project = {
    id: `${input.slug}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    slug: input.slug,
    icon: input.icon ?? 'rocket_launch',
    color: input.color ?? '#1976d2',
    description: input.description ?? `# ${input.name}\n\n`,
  };
  return { data: withProject(d, project), project };
}

export function updateProject(d: PersistedData, id: string, patch: ProjectPatch) {
  const current = d.projects.find((p) => p.id === id);
  if (!current) throw new Error(`Project "${id}" not found`);
  const project = { ...current, ...patch };
  return { data: withProject(d, project), project };
}

export function createTicket(d: PersistedData, input: NewTicketInput) {
  const project = d.projects.find((p) => p.id === input.projectId);
  if (!project) throw new Error(`Project "${input.projectId}" not found`);
  const next = (d.counters[project.id] || 0) + 1;
  const now = today();
  const ticket: Ticket = {
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
  return {
    data: { ...withTicket(d, ticket), counters: { ...d.counters, [project.id]: next } },
    ticket,
  };
}

export function updateTicket(d: PersistedData, id: string, patch: TicketPatch) {
  const current = d.tickets.find((t) => t.id === id);
  if (!current) throw new Error(`Ticket "${id}" not found`);
  const ticket = { ...current, ...patch, updated: today() };
  return { data: withTicket(d, ticket), ticket };
}

export function addComment(d: PersistedData, ticketId: string, body: string, author: string) {
  const ticket = d.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket "${ticketId}" not found`);
  const id = Math.max(Date.now(), ...ticket.comments.map((c) => c.id + 1));
  const comment: Comment = { id, author, ts: new Date().toISOString(), body };
  return { data: withComment(d, ticketId, comment), comment };
}
