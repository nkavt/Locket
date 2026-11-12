import type { Attachment, Ticket } from './types';

/** Every image on a ticket: its own and all its comments'. Names are unique across them. */
export const ticketAttachments = (ticket: Ticket | undefined): Attachment[] =>
  ticket
    ? [...(ticket.attachments ?? []), ...ticket.comments.flatMap((c) => c.attachments ?? [])]
    : [];

/** How one image is identified across the workspace: names are only unique per ticket. */
export const attachmentKey = (ticketId: string, name: string): string => `${ticketId}/${name}`;
