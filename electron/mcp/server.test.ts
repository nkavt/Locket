import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistedData, PersistedTicket } from '../db';

// In-memory stand-in for the SQLite-backed module. Mirrors the real
// load -> mutate -> save semantics without touching Electron or disk.
const store: { data: PersistedData } = { data: { projects: [], tickets: [], counters: {} } };

vi.mock('../db', () => {
  const today = () => new Date().toISOString().slice(0, 10);
  class NotFoundError extends Error {
    constructor(what: string, id: string) {
      super(`${what} "${id}" not found`);
    }
  }
  return {
    NotFoundError,
    readData: async () => structuredClone(store.data),
    createProject: async (input: { name: string; slug: string }) => {
      if (store.data.projects.some((p) => p.slug === input.slug)) {
        throw new Error(`Slug "${input.slug}" already in use`);
      }
      const project = {
        id: `${input.slug}-abcd`,
        name: input.name,
        slug: input.slug,
        icon: 'rocket_launch',
        color: '#1976d2',
        description: '',
      };
      store.data.projects.push(project);
      store.data.counters[project.id] = 0;
      return project;
    },
    updateProject: async (id: string, patch: Record<string, unknown>) => {
      const p = store.data.projects.find((x) => x.id === id);
      if (!p) throw new NotFoundError('Project', id);
      Object.assign(p, patch);
      return p;
    },
    deleteProject: async (id: string) => {
      const i = store.data.projects.findIndex((p) => p.id === id);
      if (i === -1) throw new NotFoundError('Project', id);
      store.data.projects.splice(i, 1);
      const before = store.data.tickets.length;
      store.data.tickets = store.data.tickets.filter((t) => t.projectId !== id);
      return { deletedTickets: before - store.data.tickets.length };
    },
    createTicket: async (input: {
      projectId: string;
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      labels?: string[];
      due?: string | null;
      author: string;
    }) => {
      const project = store.data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new NotFoundError('Project', input.projectId);
      const next = (store.data.counters[project.id] || 0) + 1;
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
        created: today(),
        updated: today(),
        comments: [],
      };
      store.data.tickets.push(ticket);
      store.data.counters[project.id] = next;
      return ticket;
    },
    updateTicket: async (id: string, patch: Partial<PersistedTicket>) => {
      const t = store.data.tickets.find((x) => x.id === id);
      if (!t) throw new NotFoundError('Ticket', id);
      Object.assign(t, patch, { updated: today() });
      return t;
    },
    deleteTicket: async (id: string) => {
      const i = store.data.tickets.findIndex((x) => x.id === id);
      if (i === -1) throw new NotFoundError('Ticket', id);
      store.data.tickets.splice(i, 1);
    },
    addComment: async (ticketId: string, body: string, author: string) => {
      const t = store.data.tickets.find((x) => x.id === ticketId);
      if (!t) throw new NotFoundError('Ticket', ticketId);
      const c = { id: 1, author, ts: '2026-01-01T00:00:00.000Z', body };
      t.comments.push(c);
      return c;
    },
  };
});

const { createMcpServer, ticketToMarkdown } = await import('./server');

const text = (r: { content?: unknown }) =>
  (r.content as Array<{ type: string; text: string }>)[0].text;
const parse = (r: { content?: unknown }) => JSON.parse(text(r));

async function connect(hooks = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer(hooks);
  const client = new Client({ name: 'test', version: '0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

beforeEach(() => {
  store.data = {
    projects: [
      { id: 'p1', name: 'One', slug: 'one', icon: 'bolt', color: '#000', description: '' },
      { id: 'p2', name: 'Two', slug: 'two', icon: 'bolt', color: '#000', description: '' },
    ],
    tickets: [
      {
        id: 'one-1',
        projectId: 'p1',
        title: 'Fix the bug',
        description: 'desc',
        status: 'todo',
        priority: 'high',
        labels: ['bug'],
        due: null,
        author: 'Ari',
        created: '2026-01-01',
        updated: '2026-01-01',
        comments: [],
      },
      {
        id: 'two-1',
        projectId: 'p2',
        title: 'Write docs',
        description: '',
        status: 'done',
        priority: 'low',
        labels: [],
        due: '2026-02-01',
        author: 'Sam',
        created: '2026-01-01',
        updated: '2026-01-01',
        comments: [],
      },
    ],
    counters: { p1: 1, p2: 1 },
  };
});

describe('MCP server', () => {
  it('advertises the expected tools and resources', async () => {
    const { client } = await connect();
    const tools = (await client.listTools()).tools.map((t) => t.name);
    expect(tools).toEqual([
      'list_projects',
      'create_project',
      'update_project',
      'delete_project',
      'list_tickets',
      'get_ticket',
      'create_ticket',
      'update_ticket',
      'add_comment',
      'delete_ticket',
    ]);
    const resources = (await client.listResources()).resources.map((r) => r.uri);
    expect(resources).toEqual([
      'locket://projects',
      'locket://tickets/one-1',
      'locket://tickets/two-1',
    ]);
  });

  it('lists projects with ticket counts', async () => {
    const { client } = await connect();
    const r = parse(await client.callTool({ name: 'list_projects', arguments: {} }));
    expect(r).toEqual([
      expect.objectContaining({ id: 'p1', slug: 'one', ticketCount: 1 }),
      expect.objectContaining({ id: 'p2', slug: 'two', ticketCount: 1 }),
    ]);
  });

  it('filters tickets by project, status, label and query', async () => {
    const { client } = await connect();
    const ids = async (args: Record<string, unknown>) =>
      parse(await client.callTool({ name: 'list_tickets', arguments: args })).map(
        (t: { id: string }) => t.id,
      );
    expect(await ids({})).toEqual(['one-1', 'two-1']);
    expect(await ids({ projectId: 'p2' })).toEqual(['two-1']);
    expect(await ids({ status: 'todo' })).toEqual(['one-1']);
    expect(await ids({ label: 'bug' })).toEqual(['one-1']);
    expect(await ids({ query: 'DOCS' })).toEqual(['two-1']);
    expect(await ids({ query: 'nothing' })).toEqual([]);
  });

  it('rejects invalid enum values as a tool error', async () => {
    const { client } = await connect();
    const r = await client.callTool({ name: 'list_tickets', arguments: { status: 'bogus' } });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/status/);
  });

  it('creates, updates, comments on and deletes a ticket, notifying on each write', async () => {
    const onDataChanged = vi.fn();
    const { client } = await connect({ onDataChanged });

    const created = parse(
      await client.callTool({
        name: 'create_ticket',
        arguments: { projectId: 'p1', title: 'New one', labels: ['docs'], due: '2026-03-01' },
      }),
    );
    expect(created).toMatchObject({ id: 'one-2', author: 'AI agent', labels: ['docs'] });

    const updated = parse(
      await client.callTool({
        name: 'update_ticket',
        arguments: { id: 'one-2', status: 'in_progress', due: null },
      }),
    );
    expect(updated).toMatchObject({ status: 'in_progress', due: null, labels: ['docs'] });

    const comment = parse(
      await client.callTool({
        name: 'add_comment',
        arguments: { ticketId: 'one-2', body: 'hi', author: 'Bot' },
      }),
    );
    expect(comment).toMatchObject({ body: 'hi', author: 'Bot' });

    const deleted = parse(
      await client.callTool({ name: 'delete_ticket', arguments: { id: 'one-2' } }),
    );
    expect(deleted).toEqual({ deleted: 'one-2' });
    expect(store.data.tickets.map((t) => t.id)).toEqual(['one-1', 'two-1']);
    expect(onDataChanged).toHaveBeenCalledTimes(4);
  });

  it('creates and deletes projects, cascading to tickets', async () => {
    const onDataChanged = vi.fn();
    const { client } = await connect({ onDataChanged });
    const created = parse(
      await client.callTool({
        name: 'create_project',
        arguments: { name: 'Three', slug: 'three' },
      }),
    );
    expect(created).toMatchObject({ id: 'three-abcd', slug: 'three' });

    const dup = await client.callTool({
      name: 'create_project',
      arguments: { name: 'X', slug: 'one' },
    });
    expect(dup.isError).toBe(true);
    expect(text(dup)).toMatch(/already in use/);

    const renamed = parse(
      await client.callTool({ name: 'update_project', arguments: { id: 'p1', name: 'Uno' } }),
    );
    expect(renamed).toMatchObject({ id: 'p1', name: 'Uno', slug: 'one' });

    const deleted = parse(
      await client.callTool({ name: 'delete_project', arguments: { id: 'p1' } }),
    );
    expect(deleted).toEqual({ deleted: 'p1', deletedTickets: 1 });
    expect(store.data.projects.map((p) => p.id)).toEqual(['p2', 'three-abcd']);
    expect(store.data.tickets.map((t) => t.id)).toEqual(['two-1']);
    expect(onDataChanged).toHaveBeenCalledTimes(3);
  });

  it('reports missing tickets and projects as tool errors', async () => {
    const { client } = await connect();
    const missing = await client.callTool({ name: 'get_ticket', arguments: { id: 'nope' } });
    expect(missing.isError).toBe(true);
    expect(text(missing)).toBe('Ticket "nope" not found');
    const badProject = await client.callTool({
      name: 'create_ticket',
      arguments: { projectId: 'nope', title: 'x' },
    });
    expect(badProject.isError).toBe(true);
    expect(text(badProject)).toBe('Project "nope" not found');
  });

  it('reads a ticket resource as markdown', async () => {
    const { client } = await connect();
    const r = await client.readResource({ uri: 'locket://tickets/one-1' });
    expect(r.contents[0].mimeType).toBe('text/markdown');
    expect(r.contents[0].text).toContain('# one-1: Fix the bug');
    expect(r.contents[0].text).toContain('- **Labels:** bug');
  });

  it('reads the projects resource as JSON', async () => {
    const { client } = await connect();
    const r = await client.readResource({ uri: 'locket://projects' });
    expect(JSON.parse(String(r.contents[0].text)).map((p: { id: string }) => p.id)).toEqual([
      'p1',
      'p2',
    ]);
  });

  it('emits a log line per call', async () => {
    const log = vi.fn();
    const { client } = await connect({ log });
    await client.callTool({ name: 'get_ticket', arguments: { id: 'one-1' } });
    expect(log).toHaveBeenCalledWith('tools/call get_ticket one-1');
  });
});

describe('ticketToMarkdown', () => {
  it('renders placeholders for empty fields', () => {
    const md = ticketToMarkdown({
      id: 'x-1',
      projectId: 'p',
      title: 'T',
      description: '',
      status: 'todo',
      priority: 'low',
      labels: [],
      due: null,
      author: 'A',
      created: '2026-01-01',
      updated: '2026-01-01',
      comments: [],
    });
    expect(md).toContain('_No description._');
    expect(md).toContain('_No comments yet._');
    expect(md).toContain('- **Labels:** _none_');
  });
});
