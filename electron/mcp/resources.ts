import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTicket, listProjects, listTickets } from '../services';
import type { McpContext } from './context';
import { ticketToMarkdown } from './format';

export function registerResources(server: McpServer, { log }: McpContext): void {
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
      const projects = (await listProjects()).map(
        ({ id, name, slug, icon, color, description }) => ({
          id,
          name,
          slug,
          icon,
          color,
          description,
        }),
      );
      return {
        contents: [
          { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(projects, null, 2) },
        ],
      };
    },
  );

  server.registerResource(
    'ticket',
    new ResourceTemplate('locket://tickets/{id}', {
      list: async () => {
        log('resources/list');
        const tickets = await listTickets();
        return {
          resources: tickets.map((t) => ({
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
      const ticket = await getTicket(String(id));
      return {
        contents: [{ uri: uri.href, mimeType: 'text/markdown', text: ticketToMarkdown(ticket) }],
      };
    },
  );
}
