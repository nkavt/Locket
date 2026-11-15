import { describe, expect, it, vi } from 'vitest';
import { ticketFixture, useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { createWorkflow, deleteWorkflow, getWorkflow, listWorkflows, updateWorkflow } =
  await import('./workflows');
const { createProject, updateProject, getProject } = await import('./projects');
const { createTicket, getTicket, listTickets, updateTicket } = await import('./tickets');
const { DEFAULT_WORKFLOW } = await import('../workflows/rules');

const PROJECT = {
  id: 'p1',
  name: 'One',
  slug: 'one',
  icon: 'bolt',
  color: '#000',
  description: '',
};

/** Two projects from before workflows, with tickets in each of the old statuses. */
const SEED = () => ({
  projects: [PROJECT, { ...PROJECT, id: 'p2', slug: 'two' }],
  tickets: [
    ticketFixture({ id: 'one-1', status: 'todo' }),
    ticketFixture({ id: 'one-2', status: 'in_progress' }),
    ticketFixture({ id: 'one-3', status: 'done' }),
    ticketFixture({ id: 'two-1', projectId: 'p2', status: 'in_progress' }),
  ],
  counters: { p1: 3, p2: 1 },
});

const CANCELLED = {
  name: 'Cancelled',
  icon: 'cancel',
  color: 'error.main',
  category: 'cancelled' as const,
};

describe('workflows service', () => {
  useTestDb(SEED);

  it('puts existing projects on the default workflow with their tickets unchanged', async () => {
    const [w] = await listWorkflows();
    expect(w).toEqual({
      ...DEFAULT_WORKFLOW,
      projectIds: ['p1', 'p2'],
      ticketCounts: { todo: 1, in_progress: 2, done: 1 },
    });
    expect((await getProject('p1')).workflowId).toBe('default');
    expect((await getTicket('one-2')).status).toBe('in_progress');
  });

  it('adds Cancelled to a shared workflow, and both projects can use it', async () => {
    await updateWorkflow('default', { statuses: [...DEFAULT_WORKFLOW.statuses, CANCELLED] });
    const w = await getWorkflow('default');
    const cancelled = w.statuses[3];
    expect(cancelled).toMatchObject({ name: 'Cancelled', category: 'cancelled' });
    expect((await updateTicket('one-1', { status: 'Cancelled' })).status).toBe(cancelled.id);
    expect((await updateTicket('two-1', { status: cancelled.id })).status).toBe(cancelled.id);
  });

  it('renames a shared status for every project, keeping the id tickets store', async () => {
    const statuses = DEFAULT_WORKFLOW.statuses.map((s) =>
      s.id === 'in_progress' ? { ...s, name: 'Doing' } : s,
    );
    await updateWorkflow('default', { statuses });
    expect((await listTickets({ projectId: 'p1', status: 'Doing' })).map((t) => t.id)).toEqual([
      'one-2',
    ]);
    expect((await listTickets({ status: 'doing' })).map((t) => t.id)).toEqual(['one-2', 'two-1']);
    // The old id keeps working for agents that know it.
    expect((await listTickets({ status: 'in_progress' })).length).toBe(2);
  });

  it('changes a duplicate without touching the original', async () => {
    const copy = await createWorkflow({ name: 'Copy', copyFrom: 'default' });
    expect(copy.statuses.map((s) => s.name)).toEqual(['To Do', 'In Progress', 'Done']);
    expect(copy.statuses.map((s) => s.id)).not.toEqual(['todo', 'in_progress', 'done']);
    await updateWorkflow(copy.id, {
      name: 'Copy renamed',
      statuses: [{ ...copy.statuses[0], name: 'Backlog' }, ...copy.statuses.slice(1), CANCELLED],
    });
    expect(await getWorkflow('default')).toMatchObject({
      name: 'Default',
      statuses: DEFAULT_WORKFLOW.statuses,
    });
    expect((await getWorkflow(copy.id)).statuses.map((s) => s.name)).toEqual([
      'Backlog',
      'In Progress',
      'Done',
      'Cancelled',
    ]);
  });

  it('asks where tickets go before deleting a status in use, then moves them', async () => {
    const without = DEFAULT_WORKFLOW.statuses.filter((s) => s.id !== 'in_progress');
    await expect(updateWorkflow('default', { statuses: without })).rejects.toThrow(
      /in_progress \(In Progress, 2 tickets\)/,
    );
    expect((await getTicket('two-1')).status).toBe('in_progress');
    await updateWorkflow('default', { statuses: without, moves: { in_progress: 'todo' } });
    expect((await getTicket('one-2')).status).toBe('todo');
    expect((await getTicket('two-1')).status).toBe('todo');
  });

  it('only deletes unused workflows, never the default', async () => {
    const extra = await createWorkflow({ name: 'Extra' });
    await createProject({ name: 'Three', slug: 'three', workflowId: extra.id });
    await expect(deleteWorkflow(extra.id)).rejects.toThrow(/used by three-/);
    await expect(deleteWorkflow('default')).rejects.toThrow(/cannot be deleted/);
    const unused = await createWorkflow({ name: 'Unused' });
    await deleteWorkflow(unused.id);
    expect((await listWorkflows()).map((w) => w.name)).toEqual(['Default', 'Extra']);
  });

  it('creates tickets in the first todo status of the project workflow', async () => {
    const w = await createWorkflow({
      name: 'Flow',
      statuses: [
        { name: 'Shipped', category: 'done' },
        { name: 'Inbox', category: 'todo' },
      ],
    });
    const p = await createProject({ name: 'Flow', slug: 'flow', workflowId: w.id });
    const t = await createTicket({ projectId: p.id, title: 'x', author: 'me' });
    expect(t.status).toBe(w.statuses[1].id);
  });

  it("rejects statuses outside the project's workflow, listing the allowed ones", async () => {
    const w = await createWorkflow({ name: 'Flow', statuses: [{ name: 'Inbox' }] });
    const p = await createProject({ name: 'Flow', slug: 'flow', workflowId: w.id });
    await expect(
      createTicket({ projectId: p.id, title: 'x', author: 'me', status: 'todo' }),
    ).rejects.toThrow(
      `Unknown status "todo" for workflow "Flow". Allowed: ${w.statuses[0].id} (Inbox)`,
    );
    await expect(updateTicket('one-1', { status: 'Inbox' })).rejects.toThrow(
      /Allowed: todo \(To Do\), in_progress \(In Progress\), done \(Done\)/,
    );
    await expect(listTickets({ projectId: 'p1', status: 'Inbox' })).rejects.toThrow(/Allowed/);
    await expect(listTickets({ status: 'nope' })).rejects.toThrow(/Unknown status "nope"/);
  });

  it('moves tickets by category when a project switches workflow, unless told otherwise', async () => {
    const w = await createWorkflow({
      name: 'Review',
      statuses: [
        { name: 'Backlog', category: 'todo' },
        { name: 'Doing', category: 'active' },
        { name: 'In review', category: 'active' },
        { name: 'Shipped', category: 'done' },
      ],
    });
    const [backlog, doing, review, shipped] = w.statuses.map((s) => s.id);
    await updateProject('p1', { workflowId: w.id }, { statusMap: { in_progress: 'In review' } });
    expect((await getProject('p1')).workflowId).toBe(w.id);
    expect((await getTicket('one-1')).status).toBe(backlog);
    expect((await getTicket('one-2')).status).toBe(review);
    expect((await getTicket('one-3')).status).toBe(shipped);
    // The other project on the old workflow is untouched.
    expect((await getTicket('two-1')).status).toBe('in_progress');
    expect(doing).toBeTruthy();
  });

  it('rejects an unknown workflow on create and switch', async () => {
    await expect(createProject({ name: 'X', slug: 'xx', workflowId: 'nope' })).rejects.toThrow(
      /Workflow "nope" not found/,
    );
    await expect(updateProject('p1', { workflowId: 'nope' })).rejects.toThrow(/not found/);
  });
});
