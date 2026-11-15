import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createProject,
  deleteProject,
  listProjects,
  listWorkflows,
  updateProject,
} from '../../services';
import { compact, guarded, json, type McpContext } from '../context';
import { workflowSummary } from '../format';
import { ICON_SCHEMA, COLOR_SCHEMA, SLUG } from '../schemas';

const WORKFLOW_ID = z
  .string()
  .describe('Workflow id from list_workflows; it decides which statuses tickets can have');

export function registerProjectTools(server: McpServer, { log, changed }: McpContext): void {
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description:
        'List all projects with their ids, slugs, ticket counts and workflow. The workflow ' +
        'lists the statuses tickets in that project can have (id, name, category).',
      annotations: { readOnlyHint: true },
    },
    guarded(async () => {
      log('tools/call list_projects');
      const [projects, workflows] = await Promise.all([listProjects(), listWorkflows()]);
      const byId = new Map(workflows.map((w) => [w.id, w]));
      return json(
        projects.map(({ id, name, slug, description, ticketCount, workflowId }) => ({
          id,
          name,
          slug,
          description,
          ticketCount,
          workflow: byId.has(workflowId) ? workflowSummary(byId.get(workflowId)!) : null,
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
        workflowId: WORKFLOW_ID.optional().describe(
          'Workflow id from list_workflows. Defaults to "default" (To Do, In Progress, Done)',
        ),
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
        'Update a project name, icon, colour, description or workflow. The slug cannot change. ' +
        'Switching workflow moves every ticket to a status of the new one: by statusMap where ' +
        'given, otherwise to the first status of the same category.',
      inputSchema: {
        id: z.string().describe('Project id from list_projects'),
        name: z.string().min(1).optional(),
        icon: ICON_SCHEMA.optional(),
        color: COLOR_SCHEMA.optional(),
        description: z.string().optional().describe('Markdown, replaces the whole description'),
        workflowId: WORKFLOW_ID.optional(),
        statusMap: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            'Only with workflowId: old status id → status id or name in the new workflow, ' +
              'e.g. {"in_progress": "In review"}',
          ),
      },
      annotations: { idempotentHint: true },
    },
    guarded(async ({ id, statusMap, ...patch }) => {
      log(`tools/call update_project ${id}`);
      const project = await updateProject(id, compact(patch), { statusMap });
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
