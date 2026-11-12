import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  addComment,
  addTicketAttachments,
  attachmentNames,
  createTicket,
  deleteAttachment,
  deleteTicket,
  getAttachmentData,
  getTicket,
  listTickets,
  NotFoundError,
  updateTicket,
} from '../../services';
import { DEFAULT_AUTHOR, compact, guarded, json, type McpContext } from '../context';
import { ticketSummary } from '../format';
import { applyRenames, IMAGES, imageSummary, loadImages } from '../images';
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
    guarded(async (filter) => {
      log(`tools/call list_tickets${filter.projectId ? ` ${filter.projectId}` : ''}`);
      const rows = await listTickets(filter);
      return json(rows.map(ticketSummary));
    }),
  );

  server.registerTool(
    'get_ticket',
    {
      title: 'Get ticket',
      description:
        'Get one ticket with its full description and comments. Images are listed by name under ' +
        "`attachments` (the ticket's own, and each comment's); view one with get_attachment.",
      inputSchema: { id: z.string().describe('Ticket id, e.g. plnr-3') },
      annotations: { readOnlyHint: true },
    },
    guarded(async ({ id }) => {
      log(`tools/call get_ticket ${id}`);
      return json(await getTicket(id));
    }),
  );

  server.registerTool(
    'create_ticket',
    {
      title: 'Create ticket',
      description:
        'Create a ticket in a project. The id is assigned automatically. Images can be attached ' +
        'in the same call and shown inline with ![](<name>) in the description.',
      inputSchema: {
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional().describe('Markdown'),
        images: IMAGES,
        status: STATUS.optional(),
        priority: PRIORITY.optional(),
        labels: z.array(z.string()).optional(),
        due: DATE.optional(),
        author: z.string().optional().describe(`Defaults to "${DEFAULT_AUTHOR}"`),
      },
    },
    guarded(async ({ images, ...input }) => {
      log(`tools/call create_ticket in ${input.projectId}`);
      const { files, renamed } = await loadImages(images, new Set());
      const ticket = await createTicket({
        ...input,
        description: input.description && applyRenames(input.description, renamed),
        attachments: files,
        author: input.author ?? DEFAULT_AUTHOR,
      });
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
      description:
        'Append a markdown comment to a ticket, optionally with images (shown inline with ' +
        '![](<name>) in the body, otherwise as thumbnails under the comment).',
      inputSchema: {
        ticketId: z.string(),
        body: z.string().describe('Markdown. May be empty when images are attached'),
        images: IMAGES,
        author: z.string().optional().describe(`Defaults to "${DEFAULT_AUTHOR}"`),
      },
    },
    guarded(async ({ ticketId, body, images, author }) => {
      log(`tools/call add_comment ${ticketId}`);
      if (!body.trim() && !images?.length) throw new Error('A comment needs a body or images');
      const { files, renamed } = await loadImages(images, await attachmentNames(ticketId));
      const comment = await addComment(
        ticketId,
        applyRenames(body, renamed),
        author ?? DEFAULT_AUTHOR,
        files,
      );
      await changed();
      return json(comment);
    }),
  );

  server.registerTool(
    'attach_images',
    {
      title: 'Attach images to a ticket',
      description:
        "Add images to an existing ticket itself (not to a comment). Returns each image's final " +
        'name and the markdown that shows it; put that in the description with update_ticket ' +
        'to show it inline, otherwise it appears as a thumbnail.',
      inputSchema: {
        ticketId: z.string(),
        images: IMAGES.unwrap()
          .min(1)
          .describe('Images to add; each gets a name unique within the ticket'),
      },
    },
    guarded(async ({ ticketId, images }) => {
      log(`tools/call attach_images ${ticketId}`);
      const { files } = await loadImages(images, await attachmentNames(ticketId));
      const added = await addTicketAttachments(ticketId, files);
      await changed();
      return json(imageSummary(added));
    }),
  );

  server.registerTool(
    'get_attachment',
    {
      title: 'View an image',
      description:
        "Return one image of a ticket (its own or any comment's) by name, so you can look at it.",
      inputSchema: {
        ticketId: z.string(),
        name: z.string().describe('Image name, as listed under attachments in get_ticket'),
      },
      annotations: { readOnlyHint: true },
    },
    guarded(async ({ ticketId, name }) => {
      log(`tools/call get_attachment ${ticketId} ${name}`);
      const image = await getAttachmentData(ticketId, name);
      if (!image) throw new NotFoundError('Attachment', name);
      return {
        content: [
          { type: 'image', data: Buffer.from(image.data).toString('base64'), mimeType: image.mime },
        ],
      };
    }),
  );

  server.registerTool(
    'delete_attachment',
    {
      title: 'Delete an image',
      description:
        "Permanently delete one image of a ticket (its own or a comment's) by name. Remove any " +
        '![](<name>) reference to it from the text too.',
      inputSchema: { ticketId: z.string(), name: z.string() },
      annotations: { destructiveHint: true },
    },
    guarded(async ({ ticketId, name }) => {
      log(`tools/call delete_attachment ${ticketId} ${name}`);
      await deleteAttachment(ticketId, name);
      await changed();
      return json({ deleted: name });
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
