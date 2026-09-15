import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readData } from '../db';
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
}
