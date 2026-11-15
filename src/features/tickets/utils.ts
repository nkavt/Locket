import type { Ticket, WorkflowStatus } from '@/data/types';
import { isClosed } from '@/data/workflows';

export interface TicketFilterState {
  search: string;
  status: string;
  priority: string;
}

export const EMPTY_FILTERS: TicketFilterState = { search: '', status: 'all', priority: 'all' };

export function filterTickets(tickets: Ticket[], f: TicketFilterState): Ticket[] {
  const s = f.search.trim().toLowerCase();
  return tickets.filter((t) => {
    if (f.status !== 'all' && t.status !== f.status) return false;
    if (f.priority !== 'all' && t.priority !== f.priority) return false;
    if (
      s &&
      !t.title.toLowerCase().includes(s) &&
      !t.id.toLowerCase().includes(s) &&
      !(t.labels || []).some((l) => l.toLowerCase().includes(s))
    )
      return false;
    return true;
  });
}

/** Past its due date and still open: done and cancelled tickets are never overdue. */
export function isOverdue(
  ticket: Ticket,
  status: Pick<WorkflowStatus, 'category'> | undefined,
  now = new Date(),
): boolean {
  return !!ticket.due && new Date(ticket.due) < now && !isClosed(status);
}
