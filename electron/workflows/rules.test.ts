import { describe, expect, it } from 'vitest';
import {
  buildStatuses,
  buildWorkflow,
  DEFAULT_WORKFLOW,
  defaultStatus,
  isClosed,
  mapByCategory,
  matchStatus,
  planWorkflowSwitch,
  planWorkflowUpdate,
  resolveStatus,
  type PersistedWorkflow,
} from './rules';

const REVIEW: PersistedWorkflow = {
  id: 'wf-review',
  name: 'Review',
  statuses: [
    { id: 'backlog', name: 'Backlog', icon: 'flag', color: '#455a64', category: 'todo' },
    { id: 'doing', name: 'Doing', icon: 'pending', color: 'info.main', category: 'active' },
    {
      id: 'review',
      name: 'In review',
      icon: 'rate_review',
      color: 'warning.main',
      category: 'active',
    },
    {
      id: 'shipped',
      name: 'Shipped',
      icon: 'check_circle',
      color: 'success.main',
      category: 'done',
    },
    { id: 'dropped', name: 'Dropped', icon: 'cancel', color: 'error.main', category: 'cancelled' },
  ],
};

describe('status lookup', () => {
  it('matches by id first, then by name ignoring case', () => {
    expect(matchStatus(REVIEW, 'review')?.id).toBe('review');
    expect(matchStatus(REVIEW, 'IN REVIEW')?.id).toBe('review');
    expect(matchStatus(REVIEW, ' shipped ')?.id).toBe('shipped');
    expect(matchStatus(REVIEW, 'todo')).toBeUndefined();
  });

  it('lists the allowed values when a status is unknown', () => {
    expect(() => resolveStatus(DEFAULT_WORKFLOW, 'cancelled')).toThrow(
      'Unknown status "cancelled" for workflow "Default". Allowed: todo (To Do), in_progress (In Progress), done (Done)',
    );
  });

  it('starts new tickets in the first todo status', () => {
    expect(defaultStatus(DEFAULT_WORKFLOW).id).toBe('todo');
    const doneFirst = { ...REVIEW, statuses: [REVIEW.statuses[3], ...REVIEW.statuses] };
    expect(defaultStatus(doneFirst).id).toBe('backlog');
  });

  it('treats done and cancelled as closed', () => {
    expect(REVIEW.statuses.map(isClosed)).toEqual([false, false, false, true, true]);
  });
});

describe('building workflows', () => {
  it('copies the default statuses with fresh ids when none are given', () => {
    const w = buildWorkflow({ name: 'Mine' }, new Set(), new Set(['todo', 'in_progress', 'done']));
    expect(w.id).toMatch(/^wf-mine-/);
    expect(w.statuses.map((s) => s.name)).toEqual(['To Do', 'In Progress', 'Done']);
    expect(w.statuses.map((s) => s.category)).toEqual(['todo', 'active', 'done']);
    expect(w.statuses.map((s) => s.id)).not.toContain('todo');
    expect(w.statuses[0].id).toMatch(/^to_do-[a-z0-9]{4}$/);
  });

  it('rejects empty lists, blank or duplicate names, and bad icons, colours or categories', () => {
    const own = new Set<string>();
    const none = new Set<string>();
    expect(() => buildStatuses([], own, none)).toThrow(/at least one status/);
    expect(() => buildStatuses([{ name: ' ' }], own, none)).toThrow(/needs a name/);
    expect(() => buildStatuses([{ name: 'A' }, { name: 'a' }], own, none)).toThrow(
      /Two statuses are called "a"/,
    );
    expect(() => buildStatuses([{ name: 'A', icon: 'nope_nope' }], own, none)).toThrow(
      /Unknown icon/,
    );
    expect(() => buildStatuses([{ name: 'A', color: 'red' }], own, none)).toThrow(/colour/);
    expect(() => buildStatuses([{ name: 'A', color: 'info.main' }], own, none)).not.toThrow();
    expect(() => buildStatuses([{ name: 'A', category: 'blocked' as never }], own, none)).toThrow(
      /category/,
    );
  });

  it("won't take over a status id from another workflow", () => {
    expect(() =>
      buildStatuses([{ id: 'todo', name: 'Mine' }], new Set(), new Set(['todo'])),
    ).toThrow(/not part of this workflow/);
  });
});

describe('planning an edit', () => {
  const statuses = DEFAULT_WORKFLOW.statuses;

  it('keeps ids, appends new statuses and needs no moves when nothing is stranded', () => {
    const plan = planWorkflowUpdate(
      DEFAULT_WORKFLOW,
      { statuses: [...statuses, { name: 'Cancelled', category: 'cancelled', icon: 'cancel' }] },
      { todo: 2 },
      new Set(),
    );
    expect(plan.workflow.statuses.map((s) => s.id).slice(0, 3)).toEqual([
      'todo',
      'in_progress',
      'done',
    ]);
    expect(plan.workflow.statuses[3]).toMatchObject({ name: 'Cancelled', category: 'cancelled' });
    expect(plan.moves).toEqual({});
  });

  it('needs a target for removed statuses that still have tickets, by id or name', () => {
    const without = statuses.filter((s) => s.id !== 'in_progress');
    expect(() =>
      planWorkflowUpdate(DEFAULT_WORKFLOW, { statuses: without }, { in_progress: 3 }, new Set()),
    ).toThrow(/in_progress \(In Progress, 3 tickets\).*\{"in_progress": "todo"\}/);
    const plan = planWorkflowUpdate(
      DEFAULT_WORKFLOW,
      { statuses: without, moves: { in_progress: 'Done' } },
      { in_progress: 3 },
      new Set(),
    );
    expect(plan.moves).toEqual({ in_progress: 'done' });
    // Empty statuses can just go.
    expect(
      planWorkflowUpdate(DEFAULT_WORKFLOW, { statuses: without }, {}, new Set()).moves,
    ).toEqual({});
  });

  it('rejects a move to a status that is being deleted', () => {
    const without = statuses.filter((s) => s.id !== 'in_progress');
    expect(() =>
      planWorkflowUpdate(
        DEFAULT_WORKFLOW,
        { statuses: without, moves: { in_progress: 'in_progress' } },
        { in_progress: 1 },
        new Set(),
      ),
    ).toThrow(/Unknown status "in_progress"/);
  });
});

describe('switching workflow', () => {
  it('maps each status to the first one of the same category', () => {
    expect(mapByCategory(DEFAULT_WORKFLOW, REVIEW)).toEqual({
      todo: 'backlog',
      in_progress: 'doing',
      done: 'shipped',
    });
  });

  it('falls back to the default status when the category is missing', () => {
    expect(mapByCategory(REVIEW, DEFAULT_WORKFLOW)).toEqual({
      backlog: 'todo',
      doing: 'in_progress',
      review: 'in_progress',
      shipped: 'done',
      dropped: 'todo',
    });
  });

  it('lets the caller override single statuses by id or name', () => {
    expect(planWorkflowSwitch(REVIEW, DEFAULT_WORKFLOW, { dropped: 'Done' })).toMatchObject({
      dropped: 'done',
      review: 'in_progress',
    });
    expect(() => planWorkflowSwitch(REVIEW, DEFAULT_WORKFLOW, { dropped: 'Gone' })).toThrow(
      /Allowed: todo/,
    );
  });
});
