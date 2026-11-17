// Workflow rules shared with the main process (see electron/workflows/rules.ts).
export {
  allowedStatuses,
  assertDeletable,
  buildWorkflow,
  closestStatus,
  countByStatus,
  DEFAULT_STATUS_COLOR,
  DEFAULT_STATUS_ICON,
  DEFAULT_WORKFLOW,
  DEFAULT_WORKFLOW_ID,
  defaultStatus,
  defaultWorkflow,
  findStatus,
  isClosed,
  mapByCategory,
  planWorkflowSwitch,
  planWorkflowUpdate,
  resolveStatus,
  STATUS_CATEGORIES,
  STATUS_ICONS,
  statusNameIssues,
  THEME_STATUS_COLORS,
  workflowDeleteBlocker,
  workflowUsage,
  type DeleteBlocker,
  type NewWorkflowInput,
  type PersistedStatus as WorkflowStatus,
  type PersistedWorkflow as Workflow,
  type StatusCategory,
  type StatusInput,
  type StatusNameIssue,
  type WorkflowPatch,
  type WorkflowUsage,
} from '../../electron/workflows/rules';
export { normalizeData, type LoosePersistedData } from '../../electron/workflows/normalize';

import {
  DEFAULT_WORKFLOW,
  DEFAULT_WORKFLOW_ID,
  type PersistedWorkflow,
} from '../../electron/workflows/rules';

/** Swatches in the status editor: theme colours first (they adapt to dark mode), then hex. */
export const STATUS_COLORS = [
  'text.disabled',
  'info.main',
  'success.main',
  'warning.main',
  'error.main',
  'secondary.main',
  '#7b1fa2',
  '#00838f',
  '#5d4037',
  '#455a64',
];

/**
 * The workflow a project uses, falling back to the default one. Before the workspace has
 * loaded the list is empty, so the built-in default stands in.
 */
export const workflowOf = (
  workflows: PersistedWorkflow[],
  workflowId: string | undefined,
): PersistedWorkflow =>
  workflows.find((w) => w.id === workflowId) ??
  workflows.find((w) => w.id === DEFAULT_WORKFLOW_ID) ??
  DEFAULT_WORKFLOW;
