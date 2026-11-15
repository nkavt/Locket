import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow,
  type WorkflowSummary,
} from '../../services';
import { compact, guarded, json, type McpContext } from '../context';
import { ICON_SCHEMA, STATUS_CATEGORY, STATUS_COLOR } from '../schemas';

const STATUS_INPUT = z.object({
  id: z
    .string()
    .optional()
    .describe('Keep an existing status (and its tickets) by its id; leave out for a new one'),
  name: z.string().min(1).describe('Unique within the workflow'),
  icon: ICON_SCHEMA.optional(),
  color: STATUS_COLOR.optional(),
  category: STATUS_CATEGORY.optional().describe('Defaults to todo. ' + STATUS_CATEGORY.description),
});

const STATUSES = z
  .array(STATUS_INPUT)
  .min(1)
  .describe('Every status in board order. In update_workflow, statuses left out are deleted');

/** The workflow as agents see it: statuses with ticket counts, and who uses it. */
const view = (w: WorkflowSummary) => ({
  id: w.id,
  name: w.name,
  projectIds: w.projectIds,
  statuses: w.statuses.map((s) => ({ ...s, tickets: w.ticketCounts[s.id] ?? 0 })),
});

export function registerWorkflowTools(server: McpServer, { log, changed }: McpContext): void {
  server.registerTool(
    'list_workflows',
    {
      title: 'List workflows',
      description:
        'List workflows: named, ordered status sets shared by projects. Each shows its statuses ' +
        '(id, name, icon, colour, category, ticket count) and the projects using it.',
      annotations: { readOnlyHint: true },
    },
    guarded(async () => {
      log('tools/call list_workflows');
      return json((await listWorkflows()).map(view));
    }),
  );

  server.registerTool(
    'create_workflow',
    {
      title: 'Create workflow',
      description:
        'Create a workflow. Give `statuses`, or `copyFrom` to duplicate an existing one (the ' +
        'copy can change without affecting the original); otherwise it starts with To Do, In ' +
        'Progress and Done. Assign it to a project with update_project.',
      inputSchema: {
        name: z.string().min(1),
        statuses: STATUSES.optional(),
        copyFrom: z.string().optional().describe('Workflow id whose statuses to copy'),
      },
    },
    guarded(async (input) => {
      log(`tools/call create_workflow ${input.name}`);
      const workflow = await createWorkflow(input);
      await changed();
      return json(view(workflow));
    }),
  );

  server.registerTool(
    'update_workflow',
    {
      title: 'Update workflow',
      description:
        'Rename a workflow and/or replace its statuses. Every project using it sees the change. ' +
        'Pass the full status list: keep existing statuses by id, add new ones without an id. ' +
        'Deleting a status that tickets still use needs `moves` saying where they go.',
      inputSchema: {
        id: z.string().describe('Workflow id from list_workflows'),
        name: z.string().min(1).optional(),
        statuses: STATUSES.optional(),
        moves: z
          .record(z.string(), z.string())
          .optional()
          .describe('Deleted status id → status id or name its tickets move to'),
      },
      annotations: { idempotentHint: true },
    },
    guarded(async ({ id, ...patch }) => {
      log(`tools/call update_workflow ${id}`);
      const workflow = await updateWorkflow(id, compact(patch));
      await changed();
      return json(view(workflow));
    }),
  );

  server.registerTool(
    'delete_workflow',
    {
      title: 'Delete workflow',
      description: 'Delete a workflow no project uses. The default workflow cannot be deleted.',
      inputSchema: { id: z.string().describe('Workflow id from list_workflows') },
      annotations: { destructiveHint: true },
    },
    guarded(async ({ id }) => {
      log(`tools/call delete_workflow ${id}`);
      await deleteWorkflow(id);
      await changed();
      return json({ deleted: id });
    }),
  );
}
