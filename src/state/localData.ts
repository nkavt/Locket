import type { Attachment, Comment, Project, Ticket } from '@/data/types';
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  HEX_COLOR_RE,
  isMaterialSymbol,
  unknownIconMessage,
} from '@/data/projectIcons';
import {
  buildWorkflow,
  DEFAULT_WORKFLOW_ID,
  defaultStatus,
  planWorkflowSwitch,
  planWorkflowUpdate,
  resolveStatus,
  workflowOf,
  type Workflow,
  type WorkflowPatch,
} from '@/data/workflows';
import type {
  NewAttachment,
  NewProjectInput,
  NewTicketInput,
  NewWorkflowRequest,
  PersistedData,
  ProjectPatch,
  ProjectUpdateOptions,
  TicketPatch,
} from '@/types/electron-api';

const nowIso = () => new Date().toISOString();

/** The same icon and colour rules as electron/services/projects.ts. */
function checkLook(look: { icon?: string; color?: string }) {
  if (look.icon !== undefined && !isMaterialSymbol(look.icon)) {
    throw new Error(unknownIconMessage(look.icon));
  }
  if (look.color !== undefined && !HEX_COLOR_RE.test(look.color)) {
    throw new Error(`Invalid colour "${look.color}": use a hex colour like #1976d2`);
  }
}

/** Metadata for images being saved; the bytes are stored by the caller. */
export const attachmentMeta = (list: NewAttachment[] = []): Attachment[] =>
  list.map((a) => ({ name: a.name, mime: a.mime, size: a.data.byteLength }));

// --- reducers: apply an already-decided change to a dataset -----------------

export const withProject = (d: PersistedData, project: Project): PersistedData => {
  const exists = d.projects.some((p) => p.id === project.id);
  return {
    ...d,
    projects: exists
      ? d.projects.map((p) => (p.id === project.id ? project : p))
      : [...d.projects, project],
    counters: exists ? d.counters : { ...d.counters, [project.id]: 0 },
  };
};

export const withoutProject = (d: PersistedData, id: string): PersistedData => {
  const counters = { ...d.counters };
  delete counters[id];
  return {
    ...d,
    projects: d.projects.filter((p) => p.id !== id),
    tickets: d.tickets.filter((t) => t.projectId !== id),
    counters,
  };
};

export const withTicket = (d: PersistedData, ticket: Ticket): PersistedData => ({
  ...d,
  tickets: d.tickets.some((t) => t.id === ticket.id)
    ? d.tickets.map((t) => (t.id === ticket.id ? ticket : t))
    : [...d.tickets, ticket],
});

export const withoutTicket = (d: PersistedData, id: string): PersistedData => ({
  ...d,
  tickets: d.tickets.filter((t) => t.id !== id),
});

export const withComment = (
  d: PersistedData,
  ticketId: string,
  comment: Comment,
): PersistedData => ({
  ...d,
  tickets: d.tickets.map((t) => {
    if (t.id !== ticketId) return t;
    // The Electron bridge broadcasts the fresh snapshot before the call resolves,
    // so the comment may already be present: replace it instead of appending twice.
    const exists = t.comments.some((c) => c.id === comment.id);
    return {
      ...t,
      comments: exists
        ? t.comments.map((c) => (c.id === comment.id ? comment : c))
        : [...t.comments, comment],
      updated: nowIso(),
    };
  }),
});

/** Append images to a ticket itself, skipping ones the change broadcast already delivered. */
export const withTicketAttachments = (
  d: PersistedData,
  ticketId: string,
  added: Attachment[],
): PersistedData => ({
  ...d,
  tickets: d.tickets.map((t) => {
    if (t.id !== ticketId) return t;
    const current = t.attachments ?? [];
    const fresh = added.filter((a) => !current.some((c) => c.name === a.name));
    return { ...t, attachments: [...current, ...fresh], updated: nowIso() };
  }),
});

/** Drop one image of a ticket, whether the ticket or one of its comments holds it. */
export const withoutAttachment = (
  d: PersistedData,
  ticketId: string,
  name: string,
): PersistedData => {
  const drop = (list: Attachment[] | undefined) => list?.filter((a) => a.name !== name);
  return {
    ...d,
    tickets: d.tickets.map((t) => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        attachments: drop(t.attachments),
        comments: t.comments.map((c) => ({ ...c, attachments: drop(c.attachments) })),
        updated: nowIso(),
      };
    }),
  };
};

export const withoutComment = (
  d: PersistedData,
  ticketId: string,
  commentId: number,
): PersistedData => ({
  ...d,
  tickets: d.tickets.map((t) =>
    t.id === ticketId ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) } : t,
  ),
});

// --- operations: decide the change too (browser fallback, mirrors electron/services) ---

/** The workflow a project's tickets use. */
const projectWorkflow = (d: PersistedData, projectId: string): Workflow =>
  workflowOf(d.workflows, d.projects.find((p) => p.id === projectId)?.workflowId);

/** Point tickets of `projectIds` at other statuses: old id → new id. */
const moveStatuses = (
  d: PersistedData,
  projectIds: string[],
  moves: Record<string, string>,
): PersistedData => ({
  ...d,
  tickets: d.tickets.map((t) =>
    projectIds.includes(t.projectId) && moves[t.status] ? { ...t, status: moves[t.status] } : t,
  ),
});

export function createProject(d: PersistedData, input: NewProjectInput) {
  if (d.projects.some((p) => p.slug === input.slug)) {
    throw new Error(`Slug "${input.slug}" already in use`);
  }
  checkLook(input);
  const workflowId = input.workflowId ?? DEFAULT_WORKFLOW_ID;
  if (!d.workflows.some((w) => w.id === workflowId)) {
    throw new Error(`Workflow "${workflowId}" not found`);
  }
  const project: Project = {
    id: `${input.slug}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    slug: input.slug,
    icon: input.icon ?? DEFAULT_PROJECT_ICON,
    color: input.color ?? DEFAULT_PROJECT_COLOR,
    description: input.description ?? `# ${input.name}\n\n`,
    workflowId,
  };
  return { data: withProject(d, project), project };
}

export function updateProject(
  d: PersistedData,
  id: string,
  patch: ProjectPatch,
  { statusMap }: ProjectUpdateOptions = {},
) {
  const current = d.projects.find((p) => p.id === id);
  if (!current) throw new Error(`Project "${id}" not found`);
  checkLook(patch);
  let data = d;
  if (patch.workflowId !== undefined && patch.workflowId !== current.workflowId) {
    const to = d.workflows.find((w) => w.id === patch.workflowId);
    if (!to) throw new Error(`Workflow "${patch.workflowId}" not found`);
    const from = projectWorkflow(d, id);
    data = moveStatuses(d, [id], planWorkflowSwitch(from, to, statusMap));
  }
  const project = { ...current, ...patch };
  return { data: withProject(data, project), project };
}

export function createTicket(d: PersistedData, input: NewTicketInput) {
  const project = d.projects.find((p) => p.id === input.projectId);
  if (!project) throw new Error(`Project "${input.projectId}" not found`);
  const workflow = projectWorkflow(d, project.id);
  const status = input.status ? resolveStatus(workflow, input.status) : defaultStatus(workflow);
  const next = (d.counters[project.id] || 0) + 1;
  const now = nowIso();
  const ticket: Ticket = {
    id: `${project.slug}-${next}`,
    projectId: project.id,
    title: input.title,
    description: input.description ?? '',
    status: status.id,
    priority: input.priority ?? 'medium',
    labels: input.labels ?? [],
    due: input.due ?? null,
    author: input.author,
    created: now,
    updated: now,
    comments: [],
    attachments: attachmentMeta(input.attachments),
  };
  return {
    data: { ...withTicket(d, ticket), counters: { ...d.counters, [project.id]: next } },
    ticket,
  };
}

export function updateTicket(d: PersistedData, id: string, patch: TicketPatch) {
  const current = d.tickets.find((t) => t.id === id);
  if (!current) throw new Error(`Ticket "${id}" not found`);
  const ticket = { ...current, ...patch, updated: nowIso() };
  if (patch.status !== undefined) {
    ticket.status = resolveStatus(projectWorkflow(d, current.projectId), patch.status).id;
  }
  return { data: withTicket(d, ticket), ticket };
}

export function addComment(
  d: PersistedData,
  ticketId: string,
  body: string,
  author: string,
  attachments: NewAttachment[] = [],
) {
  const ticket = d.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket "${ticketId}" not found`);
  const id = Math.max(Date.now(), ...ticket.comments.map((c) => c.id + 1));
  const comment: Comment = {
    id,
    author,
    ts: new Date().toISOString(),
    body,
    attachments: attachmentMeta(attachments),
  };
  return { data: withComment(d, ticketId, comment), comment };
}

// --- workflows (mirror electron/services/workflows.ts) ---

const allStatusIds = (d: PersistedData, except?: string) =>
  new Set(d.workflows.filter((w) => w.id !== except).flatMap((w) => w.statuses.map((s) => s.id)));

const findWorkflow = (d: PersistedData, id: string): Workflow => {
  const workflow = d.workflows.find((w) => w.id === id);
  if (!workflow) throw new Error(`Workflow "${id}" not found`);
  return workflow;
};

export function createWorkflow(d: PersistedData, input: NewWorkflowRequest) {
  const source = input.copyFrom ? findWorkflow(d, input.copyFrom) : null;
  const workflow = buildWorkflow(
    { name: input.name, statuses: input.statuses ?? source?.statuses },
    new Set(d.workflows.map((w) => w.id)),
    allStatusIds(d),
  );
  return { data: { ...d, workflows: [...d.workflows, workflow] }, workflow };
}

export function updateWorkflow(d: PersistedData, id: string, patch: WorkflowPatch) {
  const current = findWorkflow(d, id);
  const projectIds = d.projects.filter((p) => p.workflowId === id).map((p) => p.id);
  const counts: Record<string, number> = {};
  for (const t of d.tickets) {
    if (projectIds.includes(t.projectId)) counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  const { workflow, moves } = planWorkflowUpdate(current, patch, counts, allStatusIds(d, id));
  const moved = moveStatuses(d, projectIds, moves);
  const data = { ...moved, workflows: d.workflows.map((w) => (w.id === id ? workflow : w)) };
  return { data, workflow };
}

export function deleteWorkflow(d: PersistedData, id: string): PersistedData {
  const workflow = findWorkflow(d, id);
  if (id === DEFAULT_WORKFLOW_ID) throw new Error('The default workflow cannot be deleted');
  const users = d.projects.filter((p) => p.workflowId === id);
  if (users.length) {
    throw new Error(
      `Workflow "${workflow.name}" is used by ${users.map((p) => p.id).join(', ')}. ` +
        'Move those projects to another workflow first.',
    );
  }
  return { ...d, workflows: d.workflows.filter((w) => w.id !== id) };
}
