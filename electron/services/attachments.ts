import { ATTACHMENT_MIME_TYPES, isValidName, MAX_ATTACHMENT_BYTES } from '../attachments/rules';
import * as store from '../attachments/store';
import { repos, withReader, withTransaction } from '../db';
import type { AttachmentData, NewAttachment, PersistedAttachment } from '../db/types';
import { NotFoundError, ValidationError, today } from './errors';

export { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from '../attachments/rules';
export const MAX_ATTACHMENTS_PER_CALL = 20;

/**
 * Check a batch before anything is written: shape, type, size, and that every name is
 * well formed and not already used on the ticket (`ticketId` null for a ticket being created).
 */
export const validateAttachments = async (
  ticketId: string | null,
  list: NewAttachment[] | undefined,
): Promise<NewAttachment[]> => {
  if (!list?.length) return [];
  if (!Array.isArray(list)) throw new ValidationError('Attachments must be a list');
  if (list.length > MAX_ATTACHMENTS_PER_CALL) {
    throw new ValidationError(`At most ${MAX_ATTACHMENTS_PER_CALL} attachments at a time`);
  }
  const taken = ticketId ? await store.namesOf(ticketId) : new Set<string>();
  for (const a of list) {
    if (!a || !ATTACHMENT_MIME_TYPES.includes(a.mime)) {
      throw new ValidationError(`Unsupported image type "${String(a?.mime)}"`);
    }
    if (!isValidName(a.name, a.mime)) {
      throw new ValidationError(
        `Invalid image name "${String(a.name)}": use lowercase letters, digits, ".", "_" or "-" with an extension that matches the type`,
      );
    }
    if (taken.has(a.name)) {
      throw new ValidationError(`An image named "${a.name}" is already on this ticket`);
    }
    taken.add(a.name);
    if (!(a.data instanceof Uint8Array) || a.data.byteLength === 0) {
      throw new ValidationError('Attachment data must be non-empty bytes');
    }
    if (a.data.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new ValidationError(
        `"${a.name}" is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB`,
      );
    }
  }
  return list;
};

/** Add images to a ticket itself. */
export const addTicketAttachments = (
  ticketId: string,
  list: NewAttachment[],
): Promise<PersistedAttachment[]> =>
  withTransaction(async (em) => {
    if (!(await repos.tickets.findById(em, ticketId))) throw new NotFoundError('Ticket', ticketId);
    const valid = await validateAttachments(ticketId, list);
    if (!valid.length) return [];
    await repos.tickets.update(em, ticketId, { updated: today() });
    // Files last: if writing fails the transaction rolls back and nothing changed.
    return store.write(ticketId, null, valid);
  });

/** Remove one image, whether it belongs to the ticket or to one of its comments. */
export const deleteAttachment = (ticketId: string, name: string): Promise<void> =>
  withTransaction(async (em) => {
    if (!(await repos.tickets.findById(em, ticketId))) throw new NotFoundError('Ticket', ticketId);
    if (!(await store.remove(ticketId, name))) throw new NotFoundError('Attachment', name);
    await repos.tickets.update(em, ticketId, { updated: today() });
  });

/** Every image name used on a ticket, its comments included. */
export const attachmentNames = (ticketId: string): Promise<Set<string>> =>
  withReader(async (em) => {
    if (!(await repos.tickets.findById(em, ticketId))) throw new NotFoundError('Ticket', ticketId);
    return store.namesOf(ticketId);
  });

/** The image bytes, or null when the attachment no longer exists. */
export const getAttachmentData = (ticketId: string, name: string): Promise<AttachmentData | null> =>
  store.read(ticketId, name);

/**
 * Run `fn` with every live ticket id mapped to its comment ids. It holds the database
 * lock throughout, so a save that is writing files right now can never look like a leftover.
 */
const withLiveOwners = <T>(fn: (live: Map<string, Set<number>>) => Promise<T>) =>
  withReader(async (em) => {
    const tickets = await repos.tickets.findAll(em);
    return fn(new Map(tickets.map((t) => [t.id, new Set(t.comments.map((c) => c.id))])));
  });

export const attachmentUsage = (): Promise<store.StorageUsage> => withLiveOwners(store.usage);

/** Delete image folders whose ticket or comment no longer exists. */
export const cleanUpAttachments = (): Promise<{ removedFiles: number; freedBytes: number }> =>
  withLiveOwners(store.cleanUp);
