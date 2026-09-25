import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memory, resetMemory } from '../test/memory-store';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));
// Services run for real; only the SQLite store is swapped for memory.
vi.mock('../db/store', () => import('../test/memory-store'));

const { createMcpServer } = await import('./server');
const { ticketToMarkdown } = await import('./format');

type ToolResult = Awaited<ReturnType<Client['callTool']>>;

const text = (r: ToolResult) => {
  const first = (r as CallToolResult).content[0];
  if (first.type !== 'text') throw new Error(`Expected text content, got ${first.type}`);
  return first.text;
};
const parse = (r: ToolResult) => JSON.parse(text(r));

const resourceText = (r: { contents: Array<{ text?: string; blob?: string }> }) => {
  const first = r.contents[0];
  if (first.text === undefined) throw new Error('Expected a text resource, got a blob');
  return first.text;
};

async function connect(hooks = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer(hooks);
  const client = new Client({ name: 'test', version: '0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

beforeEach(() => {
  resetMemory({
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
  });
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
    expect(memory.data.tickets.map((t) => t.id)).toEqual(['one-1', 'two-1']);
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
    expect(created).toMatchObject({ slug: 'three' });
    expect(created.id).toMatch(/^three-[a-z0-9]{4}$/);

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
    expect(memory.data.projects.map((p) => p.id)).toEqual(['p2', created.id]);
    expect(memory.data.tickets.map((t) => t.id)).toEqual(['two-1']);
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
    expect(resourceText(r)).toContain('# one-1: Fix the bug');
    expect(resourceText(r)).toContain('- **Labels:** bug');
  });

  it('reads the projects resource as JSON', async () => {
    const { client } = await connect();
    const r = await client.readResource({ uri: 'locket://projects' });
    expect(JSON.parse(resourceText(r)).map((p: { id: string }) => p.id)).toEqual(['p1', 'p2']);
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
