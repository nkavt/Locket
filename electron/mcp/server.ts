import { app } from 'electron';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  addComment,
  createProject,
  createTicket,
  deleteProject,
  deleteTicket,
  readData,
  updateProject,
  updateTicket,
  type PersistedData,
  type PersistedTicket,
} from '../db';

export const SERVER_INFO = { name: 'locket', version: app.getVersion() };

const STATUS = z.enum(['todo', 'in_progress', 'done']);
const PRIORITY = z.enum(['low', 'medium', 'high']);
const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .describe('Due date as YYYY-MM-DD');

export interface McpServerHooks {
  /** Called after any tool mutates data, with the fresh dataset. */
  onDataChanged?: (data: PersistedData) => void;
  /** Human-readable activity line for the UI log. */
  log?: (line: string) => void;
}

const DEFAULT_AUTHOR = 'AI agent';

const ticketSummary = (t: PersistedTicket) => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  status: t.status,
  priority: t.priority,
  labels: t.labels,
  due: t.due,
  updated: t.updated,
  comments: t.comments.length,
});

export const ticketToMarkdown = (t: PersistedTicket): string => {
  const meta = [
    `- **Status:** ${t.status}`,
    `- **Priority:** ${t.priority}`,
    `- **Labels:** ${t.labels.length ? t.labels.join(', ') : '_none_'}`,
    `- **Due:** ${t.due ?? '_none_'}`,
    `- **Author:** ${t.author}`,
    `- **Created:** ${t.created} · **Updated:** ${t.updated}`,
  ].join('\n');
  const comments = t.comments.length
    ? t.comments.map((c) => `### ${c.author} · ${c.ts}\n\n${c.body}`).join('\n\n')
    : '_No comments yet._';
  return `# ${t.id}: ${t.title}\n\n${meta}\n\n## Description\n\n${
    t.description || '_No description._'
  }\n\n## Comments\n\n${comments}\n`;
};

const json = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
});

const fail = (message: string) => ({
  isError: true as const,
  content: [{ type: 'text' as const, text: message }],
});

/** Wrap a tool body so thrown errors become MCP tool errors instead of protocol errors. */
const guarded =
  <A>(fn: (args: A) => Promise<ReturnType<typeof json>>) =>
  async (args: A) => {
    try {
      return await fn(args);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  };

/**
 * Build a fresh MCP server exposing the planner's data. Cheap enough to create
 * per HTTP request, which is what the stateless transport expects.
 */
export function createMcpServer(hooks: McpServerHooks = {}): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      'Locket is a local task planner. Projects contain tickets identified as <slug>-<n>. ' +
      'Use list_projects to discover project ids, then list_tickets / get_ticket to read, and ' +
      'create_ticket / update_ticket / add_comment to write. Descriptions and comments are markdown.',
  });

  const changed = async () => hooks.onDataChanged?.(await readData());
  const log = (line: string) => hooks.log?.(line);

  // ----- tools -----------------------------------------------------------

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List all projects with their ids, slugs and ticket counts.',
      annotations: { readOnlyHint: true },
    },
    guarded(async () => {
      log('tools/call list_projects');
      const data = await readData();
      return json(
        data.projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          ticketCount: data.tickets.filter((t) => t.projectId === p.id).length,
        })),
      );
    }),
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description:
        'Create a project. The slug (2-12 chars, a-z 0-9 -) prefixes its ticket ids and cannot change later.',
      inputSchema: {
        name: z.string().min(1),
        slug: z.string().regex(/^[a-z0-9-]{2,12}$/),
        icon: z.string().optional().describe('Icon name, e.g. rocket_launch, bolt, science'),
        color: z.string().optional().describe('Hex colour, e.g. #1976d2'),
        description: z.string().optional().describe('Markdown'),
      },
    },
    guarded(async (input) => {
      log(`tools/call create_project ${input.slug}`);
      const project = await createProject(input);
      await changed();
      return json(project);
    }),
  );

  server.registerTool(
    'update_project',
    {
      title: 'Update project',
      description: 'Update a project name, icon, colour or description. The slug cannot change.',
      inputSchema: {
        id: z.string().describe('Project id from list_projects'),
        name: z.string().min(1).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional().describe('Markdown, replaces the whole description'),
      },
      annotations: { idempotentHint: true },
    },
    guarded(async ({ id, ...patch }) => {
      log(`tools/call update_project ${id}`);
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const project = await updateProject(id, defined);
      await changed();
      return json(project);
    }),
  );

  server.registerTool(
    'delete_project',
    {
      title: 'Delete project',
      description: 'Permanently delete a project and every ticket in it.',
      inputSchema: { id: z.string().describe('Project id from list_projects') },
      annotations: { destructiveHint: true },
    },
    guarded(async ({ id }) => {
      log(`tools/call delete_project ${id}`);
      const result = await deleteProject(id);
      await changed();
      return json({ deleted: id, ...result });
    }),
  );

  server.registerTool(
    'list_tickets',
    {
      title: 'List tickets',
      description:
        'List tickets, optionally filtered by project, status, priority, label or a text query over title/id/labels. Returns summaries; use get_ticket for full content.',
      inputSchema: {
        projectId: z.string().optional().describe('Restrict to one project id'),
        status: STATUS.optional(),
        priority: PRIORITY.optional(),
        label: z.string().optional().describe('Only tickets carrying this label'),
        query: z
          .string()
          .optional()
          .describe('Case-insensitive substring over title, id and labels'),
      },
      annotations: { readOnlyHint: true },
    },
    guarded(async ({ projectId, status, priority, label, query }) => {
      log(`tools/call list_tickets${projectId ? ` ${projectId}` : ''}`);
      const data = await readData();
      const q = query?.trim().toLowerCase();
      const rows = data.tickets.filter(
        (t) =>
          (!projectId || t.projectId === projectId) &&
          (!status || t.status === status) &&
          (!priority || t.priority === priority) &&
          (!label || t.labels.includes(label)) &&
          (!q ||
            t.title.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            t.labels.some((l) => l.toLowerCase().includes(q))),
      );
      return json(rows.map(ticketSummary));
    }),
  );

  server.registerTool(
    'get_ticket',
    {
      title: 'Get ticket',
      description: 'Get one ticket with its full description and comments.',
      inputSchema: { id: z.string().describe('Ticket id, e.g. plnr-3') },
      annotations: { readOnlyHint: true },
    },
    guarded(async ({ id }) => {
      log(`tools/call get_ticket ${id}`);
      const data = await readData();
      const ticket = data.tickets.find((t) => t.id === id);
      if (!ticket) return fail(`Ticket "${id}" not found`);
      return json(ticket);
    }),
  );

  server.registerTool(
    'create_ticket',
    {
      title: 'Create ticket',
      description: 'Create a ticket in a project. The id is assigned automatically.',
      inputSchema: {
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional().describe('Markdown'),
        status: STATUS.optional(),
        priority: PRIORITY.optional(),
        labels: z.array(z.string()).optional(),
        due: DATE.optional(),
        author: z.string().optional().describe(`Defaults to "${DEFAULT_AUTHOR}"`),
      },
    },
    guarded(async (input) => {
      log(`tools/call create_ticket in ${input.projectId}`);
      const ticket = await createTicket({ ...input, author: input.author ?? DEFAULT_AUTHOR });
      await changed();
      return json(ticket);
    }),
  );

  server.registerTool(
    'update_ticket',
    {
      title: 'Update ticket',
      description: 'Update fields of an existing ticket. Only the provided fields change.',
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional().describe('Markdown, replaces the whole description'),
        status: STATUS.optional(),
        priority: PRIORITY.optional(),
        labels: z.array(z.string()).optional().describe('Replaces the whole label list'),
        due: DATE.nullable().optional().describe('null clears the due date'),
      },
      annotations: { idempotentHint: true },
    },
    guarded(async ({ id, ...patch }) => {
      log(`tools/call update_ticket ${id}`);
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const ticket = await updateTicket(id, defined);
      await changed();
      return json(ticket);
    }),
  );

  server.registerTool(
    'add_comment',
    {
      title: 'Add comment',
      description: 'Append a markdown comment to a ticket.',
      inputSchema: {
        ticketId: z.string(),
        body: z.string().min(1).describe('Markdown'),
        author: z.string().optional().describe(`Defaults to "${DEFAULT_AUTHOR}"`),
      },
    },
    guarded(async ({ ticketId, body, author }) => {
      log(`tools/call add_comment ${ticketId}`);
      const comment = await addComment(ticketId, body, author ?? DEFAULT_AUTHOR);
      await changed();
      return json(comment);
    }),
  );

  server.registerTool(
    'delete_ticket',
    {
      title: 'Delete ticket',
      description: 'Permanently delete a ticket and its comments.',
      inputSchema: { id: z.string() },
      annotations: { destructiveHint: true },
    },
    guarded(async ({ id }) => {
      log(`tools/call delete_ticket ${id}`);
      await deleteTicket(id);
      await changed();
      return json({ deleted: id });
    }),
  );

  // ----- resources -------------------------------------------------------

  server.registerResource(
    'projects',
    'locket://projects',
    {
      title: 'Projects',
      description: 'All projects as JSON',
      mimeType: 'application/json',
    },
    async (uri) => {
      log('resources/read locket://projects');
      const data = await readData();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(data.projects, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    'ticket',
    new ResourceTemplate('locket://tickets/{id}', {
      list: async () => {
        log('resources/list');
        const data = await readData();
        return {
          resources: data.tickets.map((t) => ({
            uri: `locket://tickets/${t.id}`,
            name: `${t.id}: ${t.title}`,
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    {
      title: 'Ticket',
      description: 'One ticket rendered as markdown, including comments',
      mimeType: 'text/markdown',
    },
    async (uri, { id }) => {
      log(`resources/read ${uri.href}`);
      const data = await readData();
      const ticket = data.tickets.find((t) => t.id === id);
      if (!ticket) throw new Error(`Ticket "${String(id)}" not found`);
      return {
        contents: [{ uri: uri.href, mimeType: 'text/markdown', text: ticketToMarkdown(ticket) }],
      };
    },
  );

  return server;
}
