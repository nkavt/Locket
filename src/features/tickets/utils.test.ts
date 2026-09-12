import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, filterTickets, isOverdue } from './utils';
import { makeTicket } from '@/test/fixtures';

const tickets = [
  makeTicket({
    id: 'tst-1',
    title: 'Fix login bug',
    status: 'todo',
    priority: 'high',
    labels: ['bug'],
  }),
  makeTicket({
    id: 'tst-2',
    title: 'Dark mode',
    status: 'in_progress',
    priority: 'low',
    labels: ['design'],
  }),
  makeTicket({ id: 'tst-3', title: 'Write docs', status: 'done', priority: 'medium', labels: [] }),
];

describe('filterTickets', () => {
  it('returns everything with empty filters', () => {
    expect(filterTickets(tickets, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by status and priority', () => {
    expect(filterTickets(tickets, { ...EMPTY_FILTERS, status: 'done' }).map((t) => t.id)).toEqual([
      'tst-3',
    ]);
    expect(filterTickets(tickets, { ...EMPTY_FILTERS, priority: 'high' }).map((t) => t.id)).toEqual(
      ['tst-1'],
    );
  });

  it('searches title, id and labels case-insensitively', () => {
    expect(filterTickets(tickets, { ...EMPTY_FILTERS, search: 'LOGIN' }).map((t) => t.id)).toEqual([
      'tst-1',
    ]);
    expect(filterTickets(tickets, { ...EMPTY_FILTERS, search: 'tst-2' }).map((t) => t.id)).toEqual([
      'tst-2',
    ]);
    expect(filterTickets(tickets, { ...EMPTY_FILTERS, search: 'design' }).map((t) => t.id)).toEqual(
      ['tst-2'],
    );
  });

  it('combines filters with AND', () => {
    expect(filterTickets(tickets, { search: 'bug', status: 'done', priority: 'all' })).toHaveLength(
      0,
    );
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-06-01');
  it('is true for a past due date on an open ticket', () => {
    expect(isOverdue(makeTicket({ due: '2026-05-01', status: 'todo' }), now)).toBe(true);
  });
  it('is false when done, in the future, or without a due date', () => {
    expect(isOverdue(makeTicket({ due: '2026-05-01', status: 'done' }), now)).toBe(false);
    expect(isOverdue(makeTicket({ due: '2026-07-01' }), now)).toBe(false);
    expect(isOverdue(makeTicket({ due: null }), now)).toBe(false);
  });
});
