import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createProject, deleteProject, listProjects, updateProject } from '../../services';
import { compact, guarded, json, type McpContext } from '../context';
import { archiveFields } from '../format';
import { ICON_SCHEMA, COLOR_SCHEMA, SLUG } from '../schemas';

export function registerProjectTools(server: McpServer, { log, changed }: McpContext): void {
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description:
        'List active projects with their ids, slugs and ticket counts. Archived projects are ' +
        'left out unless includeArchived is true.',
      inputSchema: {
        includeArchived: z
          .boolean()
          .optional()
          .describe('Also return archived projects (each has archived: true)'),
      },
      annotations: { readOnlyHint: true },
    },
    guarded(async ({ includeArchived }) => {
      log(`tools/call list_projects${includeArchived ? ' includeArchived' : ''}`);
      const projects = await listProjects({ includeArchived });
      return json(
        projects.map(({ id, name, slug, description, ticketCount, archivedAt }) => ({
          id,
          name,
          slug,
          description,
          ticketCount,
          ...archiveFields(archivedAt),
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
        icon: ICON_SCHEMA.optional(),
        color: COLOR_SCHEMA.optional(),
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
      description:
        'Update a project name, icon, colour or description, or archive/unarchive it. The slug ' +
        'cannot change. Archived projects are hidden from list_projects and refuse new tickets; ' +
        'their existing tickets can still be updated and commented on.',
      inputSchema: {
        id: z.string().describe('Project id from list_projects'),
        name: z.string().min(1).optional(),
        icon: ICON_SCHEMA.optional(),
        color: COLOR_SCHEMA.optional(),
        description: z.string().optional().describe('Markdown, replaces the whole description'),
        archived: z.boolean().optional().describe('true archives the project, false restores it'),
      },
      annotations: { idempotentHint: true },
    },
    guarded(async ({ id, ...patch }) => {
      log(`tools/call update_project ${id}`);
      const { archivedAt, ...project } = await updateProject(id, compact(patch));
      await changed();
      return json({ ...project, ...archiveFields(archivedAt) });
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
