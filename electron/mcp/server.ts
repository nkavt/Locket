import { app } from 'electron';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createContext, type McpServerHooks } from './context';
import { registerResources } from './resources';
import { registerProjectTools } from './tools/projects';
import { registerTicketTools } from './tools/tickets';

export type { McpServerHooks } from './context';

export const SERVER_INFO = { name: 'locket', version: app.getVersion() };

const INSTRUCTIONS =
  'Locket is a local task planner. Projects contain tickets identified as <slug>-<n>. ' +
  'Use list_projects to discover project ids, then list_tickets / get_ticket to read, and ' +
  'create_ticket / update_ticket / add_comment to write. Descriptions and comments are markdown.';

/**
 * Build a fresh MCP server exposing the planner's data. Cheap enough to create
 * per HTTP request, which is what the stateless transport expects.
 */
export function createMcpServer(hooks: McpServerHooks = {}): McpServer {
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });
  const ctx = createContext(hooks);

  registerProjectTools(server, ctx);
  registerTicketTools(server, ctx);
  registerResources(server, ctx);

  return server;
}
