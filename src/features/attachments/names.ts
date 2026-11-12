import { ticketAttachments } from '@/data/attachments';
import type { Ticket } from '@/data/types';

/*
 * Images are referenced by name, e.g. `![](login-screen.png)`. Names are unique
 * within a ticket (its own images and every comment's), lowercase and URL-safe, so people
 * and LLMs can type them by hand. The rules live in electron/attachments/rules.ts,
 * shared with the main process.
 */

export { slugName, uniqueName } from '../../../electron/attachments/rules';

export const ticketNames = (ticket: Ticket | undefined): Set<string> =>
  new Set(ticketAttachments(ticket).map((a) => a.name));
