import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createProject, deleteProject, listProjects, updateProject } from '../../services';
import { compact, guarded, json, type McpContext } from '../context';
import { SLUG } from '../schemas';

export function registerProjectTools(server: McpServer, { log, changed }: McpContext): void {
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List all projects with their ids, slugs and ticket counts.',
      annotations: { readOnlyHint: true },
    },
    guarded(async () => {
      log('tools/call list_projects');
      const projects = await listProjects();
      return json(
        projects.map(({ id, name, slug, description, ticketCount }) => ({
          id,
          name,
          slug,
          description,
          ticketCount,
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
        slug: SLUG,
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
      const project = await updateProject(id, compact(patch));
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
}
