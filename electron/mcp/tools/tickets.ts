import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addComment, createTicket, deleteTicket, readData, updateTicket } from '../../db';
import { DEFAULT_AUTHOR, compact, fail, guarded, json, type McpContext } from '../context';
import { ticketSummary } from '../format';
import { DATE, PRIORITY, STATUS } from '../schemas';

export function registerTicketTools(server: McpServer, { log, changed }: McpContext): void {
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
      const ticket = await updateTicket(id, compact(patch));
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
}
