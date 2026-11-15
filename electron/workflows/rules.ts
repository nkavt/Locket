/*
 * Workflows: named, ordered sets of ticket statuses that projects share. Shared by the main
 * process and the renderer (the browser fallback runs the same rules), so this file must stay
 * free of Node and DOM APIs, like projects/icons.ts.
 *
 * Anything that needs to know what a status *means* reads its category, never its name.
 */
import { ValidationError } from '../services/errors';
import { HEX_COLOR_RE, isMaterialSymbol, unknownIconMessage } from '../projects/icons';

export const STATUS_CATEGORIES = ['todo', 'active', 'done', 'cancelled'] as const;
export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

export interface PersistedStatus {
  id: string;
  name: string;
  /** Material Symbols name. */
  icon: string;
  /** A hex colour, or one of THEME_STATUS_COLORS so it follows light/dark mode. */
  color: string;
  category: StatusCategory;
}

export interface PersistedWorkflow {
  id: string;
  name: string;
  /** In board order. */
  statuses: PersistedStatus[];
}

/** A status as sent by an editor: existing ones keep their id, new ones have none. */
export interface StatusInput {
  id?: string;
  name: string;
  icon?: string;
  color?: string;
  category?: StatusCategory;
}

export interface NewWorkflowInput {
  name: string;
  /** Defaults to a copy of the default workflow's statuses. */
  statuses?: StatusInput[];
}

export interface WorkflowPatch {
  name?: string;
  /** The complete new list, in order. Statuses left out are deleted. */
  statuses?: StatusInput[];
  /** Where tickets of deleted statuses go: deleted status id → status id or name. */
  moves?: Record<string, string>;
}

export const DEFAULT_WORKFLOW_ID = 'default';

/** Theme colours a status may use besides hex, so the built-in ones adapt to dark mode. */
export const THEME_STATUS_COLORS = [
  'text.disabled',
  'info.main',
  'success.main',
  'warning.main',
  'error.main',
  'secondary.main',
] as const;

/** Suggested icons in the status editor. */
export const STATUS_ICONS = [
  'radio_button_unchecked',
  'pending',
  'check_circle',
  'cancel',
  'block',
  'rate_review',
  'hourglass_empty',
  'pause_circle',
  'bug_report',
  'flag',
  'schedule',
  'visibility',
];

export const DEFAULT_STATUS_ICON = 'radio_button_unchecked';
export const DEFAULT_STATUS_COLOR = 'text.disabled';

/** Seeded on first start and on upgrade. The ids match the three statuses Locket always had. */
export const DEFAULT_WORKFLOW: PersistedWorkflow = {
  id: DEFAULT_WORKFLOW_ID,
  name: 'Default',
  statuses: [
    {
      id: 'todo',
      name: 'To Do',
      icon: 'radio_button_unchecked',
      color: 'text.disabled',
      category: 'todo',
    },
    {
      id: 'in_progress',
      name: 'In Progress',
      icon: 'pending',
      color: 'info.main',
      category: 'active',
    },
    { id: 'done', name: 'Done', icon: 'check_circle', color: 'success.main', category: 'done' },
  ],
};

export const defaultWorkflow = (): PersistedWorkflow => structuredClone(DEFAULT_WORKFLOW);

export const isStatusCategory = (v: unknown): v is StatusCategory =>
  typeof v === 'string' && (STATUS_CATEGORIES as readonly string[]).includes(v);

export const isStatusColor = (v: unknown): v is string =>
  typeof v === 'string' &&
  (HEX_COLOR_RE.test(v) || (THEME_STATUS_COLORS as readonly string[]).includes(v));

/** Closed statuses: no longer worked on, never overdue. */
export const isClosed = (s: Pick<PersistedStatus, 'category'> | undefined): boolean =>
  s?.category === 'done' || s?.category === 'cancelled';

const shortId = (): string => Math.random().toString(36).slice(2, 6);

const slugPart = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20) || 'status';

/** A fresh id such as "in_review-x7k2", readable in MCP output and unique across workflows. */
export const newStatusId = (name: string, taken: ReadonlySet<string> = new Set()): string => {
  let id: string;
  do id = `${slugPart(name)}-${shortId()}`;
  while (taken.has(id));
  return id;
};

export const newWorkflowId = (name: string, taken: ReadonlySet<string> = new Set()): string => {
  let id: string;
  do id = `wf-${slugPart(name).replace(/_/g, '-')}-${shortId()}`;
  while (taken.has(id));
  return id;
};

export const findStatus = (
  workflow: PersistedWorkflow | undefined,
  id: string,
): PersistedStatus | undefined => workflow?.statuses.find((s) => s.id === id);

/** Where new tickets start: the first `todo` status, else the first one. */
export const defaultStatus = (workflow: PersistedWorkflow): PersistedStatus =>
  workflow.statuses.find((s) => s.category === 'todo') ?? workflow.statuses[0];

/** "todo (To Do), in_progress (In Progress), …" for error messages. */
export const allowedStatuses = (workflow: PersistedWorkflow): string =>
  workflow.statuses.map((s) => `${s.id} (${s.name})`).join(', ');

/** Match a status by id, or else by name ignoring case. */
export const matchStatus = (
  workflow: PersistedWorkflow,
  idOrName: string,
): PersistedStatus | undefined => {
  const byId = findStatus(workflow, idOrName);
  if (byId) return byId;
  const name = idOrName.trim().toLowerCase();
  return workflow.statuses.find((s) => s.name.toLowerCase() === name);
};

/** Like matchStatus, but an unknown value is an error listing what is allowed. */
export const resolveStatus = (workflow: PersistedWorkflow, idOrName: string): PersistedStatus => {
  const status = matchStatus(workflow, idOrName);
  if (!status) {
    throw new ValidationError(
      `Unknown status "${idOrName}" for workflow "${workflow.name}". Allowed: ${allowedStatuses(workflow)}`,
    );
  }
  return status;
};

/**
 * Where each status of `from` goes in `to`: the first status of the same category, else the
 * target's default. Used when a project switches workflow; the app shows it for review first.
 */
export const mapByCategory = (
  from: PersistedWorkflow,
  to: PersistedWorkflow,
): Record<string, string> =>
  Object.fromEntries(
    from.statuses.map((s) => {
      const same =
        to.statuses.find((t) => t.id === s.id) ??
        to.statuses.find((t) => t.category === s.category) ??
        defaultStatus(to);
      return [s.id, same.id];
    }),
  );

const checkName = (name: unknown, what: string): string => {
  if (typeof name !== 'string' || !name.trim()) throw new ValidationError(`${what} needs a name`);
  return name.trim();
};

/**
 * Turn an editor's status list into stored statuses: checks every field, keeps ids that
 * already belong to this workflow and mints new ones otherwise. `taken` are ids used by
 * other workflows, which must not be reused.
 */
export const buildStatuses = (
  inputs: StatusInput[] | undefined,
  own: ReadonlySet<string>,
  taken: ReadonlySet<string>,
): PersistedStatus[] => {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new ValidationError('A workflow needs at least one status');
  }
  const used = new Set(taken);
  const names = new Set<string>();
  return inputs.map((input) => {
    const name = checkName(input?.name, 'Every status');
    const key = name.toLowerCase();
    if (names.has(key)) throw new ValidationError(`Two statuses are called "${name}"`);
    names.add(key);
    const icon = input.icon ?? DEFAULT_STATUS_ICON;
    if (!isMaterialSymbol(icon)) throw new ValidationError(unknownIconMessage(String(icon)));
    const color = input.color ?? DEFAULT_STATUS_COLOR;
    if (!isStatusColor(color)) {
      throw new ValidationError(
        `Invalid colour "${String(color)}": use a hex colour like #1976d2 or one of ${THEME_STATUS_COLORS.join(', ')}`,
      );
    }
    const category = input.category ?? 'todo';
    if (!isStatusCategory(category)) {
      throw new ValidationError(
        `Invalid category "${String(category)}": use ${STATUS_CATEGORIES.join(', ')}`,
      );
    }
    let id = input.id;
    if (id !== undefined && (!own.has(id) || used.has(id))) {
      throw new ValidationError(`Status "${id}" is not part of this workflow`);
    }
    id ??= newStatusId(name, new Set([...used, ...own]));
    used.add(id);
    return { id, name, icon, color, category };
  });
};

/** A new workflow, with fresh status ids so it never shares them with another one. */
export const buildWorkflow = (
  input: NewWorkflowInput,
  takenWorkflowIds: ReadonlySet<string>,
  takenStatusIds: ReadonlySet<string>,
): PersistedWorkflow => {
  const name = checkName(input.name, 'A workflow');
  // Copies never keep ids: every workflow owns its statuses.
  const statuses = (input.statuses ?? DEFAULT_WORKFLOW.statuses).map((s) => ({
    name: s.name,
    icon: s.icon,
    color: s.color,
    category: s.category,
  }));
  return {
    id: newWorkflowId(name, takenWorkflowIds),
    name,
    statuses: buildStatuses(statuses, new Set(), takenStatusIds),
  };
};

export interface WorkflowUpdatePlan {
  workflow: PersistedWorkflow;
  /** Ticket moves to apply: old status id → new status id. */
  moves: Record<string, string>;
}

/**
 * Check an edit before it is saved. Statuses that are removed while tickets still use them
 * need a target in `patch.moves`; the error lists them with their ticket counts.
 */
export const planWorkflowUpdate = (
  current: PersistedWorkflow,
  patch: WorkflowPatch,
  ticketCounts: Record<string, number>,
  takenStatusIds: ReadonlySet<string>,
): WorkflowUpdatePlan => {
  const name = patch.name === undefined ? current.name : checkName(patch.name, 'A workflow');
  const statuses =
    patch.statuses === undefined
      ? current.statuses
      : buildStatuses(patch.statuses, new Set(current.statuses.map((s) => s.id)), takenStatusIds);
  const workflow = { id: current.id, name, statuses };

  const moves: Record<string, string> = {};
  const stranded: PersistedStatus[] = [];
  for (const old of current.statuses) {
    if (statuses.some((s) => s.id === old.id) || !ticketCounts[old.id]) continue;
    const target = patch.moves?.[old.id];
    if (target === undefined) stranded.push(old);
    else moves[old.id] = resolveStatus(workflow, target).id;
  }
  if (stranded.length) {
    const list = stranded.map((s) => `${s.id} (${s.name}, ${ticketCounts[s.id]} tickets)`);
    throw new ValidationError(
      `Removed statuses still have tickets: ${list.join(', ')}. Say where they go with moves, ` +
        `e.g. {"${stranded[0].id}": "${defaultStatus(workflow).id}"}`,
    );
  }
  return { workflow, moves };
};

/**
 * Tickets of a project that switches workflow: every status in use must map to a status of
 * the new one. Missing entries fall back to mapByCategory; given ones may be ids or names.
 */
export const planWorkflowSwitch = (
  from: PersistedWorkflow,
  to: PersistedWorkflow,
  statusMap: Record<string, string> = {},
): Record<string, string> => {
  const auto = mapByCategory(from, to);
  return Object.fromEntries(
    from.statuses.map((s) => {
      const given = statusMap[s.id];
      return [s.id, given === undefined ? auto[s.id] : resolveStatus(to, given).id];
    }),
  );
};
