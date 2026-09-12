import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { app } from 'electron';
import * as path from 'node:path';
import { CommentEntity, CounterEntity, MetaEntity, ProjectEntity, TicketEntity } from './entities';

export interface PersistedComment {
  id: number;
  author: string;
  ts: string;
  body: string;
}

export interface PersistedTicket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  labels: string[];
  due: string | null;
  author: string;
  created: string;
  updated: string;
  comments: PersistedComment[];
}

export interface PersistedProject {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}

export interface PersistedData {
  projects: PersistedProject[];
  tickets: PersistedTicket[];
  counters: Record<string, number>;
}

let dataSource: DataSource | null = null;

export const initDb = async (): Promise<void> => {
  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: path.join(app.getPath('userData'), 'locket.db'),
    entities: [ProjectEntity, TicketEntity, CommentEntity, CounterEntity, MetaEntity],
    synchronize: true,
  });
  await dataSource.initialize();
};

const getDataSource = (): DataSource => {
  if (!dataSource) throw new Error('Database not initialized');
  return dataSource;
};

// null means "never saved" (first run) — distinct from a legitimately empty workspace
export const loadData = async (): Promise<PersistedData | null> => {
  const ds = getDataSource();
  const initialized = await ds.getRepository(MetaEntity).findOneBy({ key: 'initialized' });
  if (!initialized) return null;

  const [projects, tickets, comments, counters] = await Promise.all([
    ds.getRepository(ProjectEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(TicketEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(CommentEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(CounterEntity).find(),
  ]);

  const commentsByTicket = new Map<string, PersistedComment[]>();
  for (const c of comments) {
    const list = commentsByTicket.get(c.ticketId) || [];
    list.push({ id: c.id, author: c.author, ts: c.ts, body: c.body });
    commentsByTicket.set(c.ticketId, list);
  }

  return {
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      icon: p.icon,
      color: p.color,
      description: p.description,
    })),
    tickets: tickets.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      labels: t.labels,
      due: t.due,
      author: t.author,
      created: t.created,
      updated: t.updated,
      comments: commentsByTicket.get(t.id) || [],
    })),
    counters: Object.fromEntries(counters.map((c) => [c.projectId, c.value])),
  };
};

const validateData = (data: PersistedData): void => {
  if (
    !data ||
    !Array.isArray(data.projects) ||
    !Array.isArray(data.tickets) ||
    typeof data.counters !== 'object' ||
    data.counters === null
  ) {
    throw new Error('Invalid data payload');
  }
};

export const saveData = async (data: PersistedData): Promise<void> => {
  validateData(data);
  const ds = getDataSource();
  await ds.transaction(async (em) => {
    await em.clear(CommentEntity);
    await em.clear(TicketEntity);
    await em.clear(ProjectEntity);
    await em.clear(CounterEntity);

    await em.save(
      ProjectEntity,
      data.projects.map((p, i) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        icon: p.icon,
        color: p.color,
        description: p.description,
        position: i,
      })),
    );
    await em.save(
      TicketEntity,
      data.tickets.map((t, i) => ({
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        labels: t.labels || [],
        due: t.due ?? null,
        author: t.author,
        created: t.created,
        updated: t.updated,
        position: i,
      })),
    );
    await em.save(
      CommentEntity,
      data.tickets.flatMap((t) =>
        (t.comments || []).map((c, i) => ({
          id: c.id,
          ticketId: t.id,
          author: c.author,
          ts: c.ts,
          body: c.body,
          position: i,
        })),
      ),
    );
    await em.save(
      CounterEntity,
      Object.entries(data.counters).map(([projectId, value]) => ({
        projectId,
        value,
      })),
    );
    await em.save(MetaEntity, { key: 'initialized', value: '1' });
  });
};

// ---------------------------------------------------------------------------
// Granular operations used by the MCP server. The store is a whole-dataset
// document, so every mutation is load -> change -> save, serialised through a
// single lock so MCP writes and renderer writes never interleave.
// ---------------------------------------------------------------------------

let chain: Promise<unknown> = Promise.resolve();

/** Run `fn` exclusively against the database. */
export const withDbLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
};

const EMPTY: PersistedData = { projects: [], tickets: [], counters: {} };

const today = (): string => new Date().toISOString().slice(0, 10);

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} "${id}" not found`);
    this.name = 'NotFoundError';
  }
}

/** Apply a mutation to the whole dataset under the lock and persist it. */
const mutate = <T>(fn: (data: PersistedData) => T): Promise<T> =>
  withDbLock(async () => {
    const data = (await loadData()) ?? structuredClone(EMPTY);
    const result = fn(data);
    await saveData(data);
    return result;
  });

export const readData = (): Promise<PersistedData> =>
  withDbLock(async () => (await loadData()) ?? structuredClone(EMPTY));

export interface NewTicketInput {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  due?: string | null;
  author: string;
}

export type TicketPatch = Partial<
  Pick<PersistedTicket, 'title' | 'description' | 'status' | 'priority' | 'labels' | 'due'>
>;

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

export const addComment = (
  ticketId: string,
  body: string,
  author: string,
): Promise<PersistedComment> =>
  mutate((data) => {
    const ticket = data.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    const comment: PersistedComment = {
      id: Date.now(),
      author,
      ts: new Date().toISOString(),
      body,
    };
    ticket.comments.push(comment);
    ticket.updated = today();
    return comment;
  });

export interface NewProjectInput {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
}

const SLUG_RE = /^[a-z0-9-]{2,12}$/;

export const createProject = (input: NewProjectInput): Promise<PersistedProject> =>
  mutate((data) => {
    if (!SLUG_RE.test(input.slug)) {
      throw new Error(`Invalid slug "${input.slug}": use 2-12 chars of a-z, 0-9 or "-"`);
    }
    if (data.projects.some((p) => p.slug === input.slug)) {
      throw new Error(`Slug "${input.slug}" already in use`);
    }
    const project: PersistedProject = {
      id: `${input.slug}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? 'rocket_launch',
      color: input.color ?? '#1976d2',
      description: input.description ?? `# ${input.name}\n\n`,
    };
    data.projects.push(project);
    data.counters[project.id] = 0;
    return project;
  });

/** Delete a project and every ticket in it. */
export const deleteProject = (id: string): Promise<{ deletedTickets: number }> =>
  mutate((data) => {
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundError('Project', id);
    data.projects.splice(idx, 1);
    const before = data.tickets.length;
    data.tickets = data.tickets.filter((t) => t.projectId !== id);
    delete data.counters[id];
    return { deletedTickets: before - data.tickets.length };
  });
