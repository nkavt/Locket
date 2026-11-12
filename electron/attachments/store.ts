import { app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AttachmentData, NewAttachment, PersistedAttachment } from '../db/types';
import { mimeOfName, NAME_RE } from './rules';

/*
 * Images live as plain files next to the database, under their own names:
 *
 *   attachments/<ticketId>/ticket/<name>
 *   attachments/<ticketId>/comments/<commentId>/<name>
 *
 * A name is unique within its ticket (the ticket's own images and every comment's), so
 * markdown anywhere on the ticket can show one with `![](<name>)`. Type and size
 * come from the file itself, so there is no table to keep in sync.
 */

const TICKET_DIR = 'ticket';
const COMMENTS_DIR = 'comments';

/** Ticket ids are "<slug>-<n>"; anything else could step outside the attachments folder. */
const TICKET_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

let rootOverride: string | null = null;

/** Tests point this at a temp folder; the app uses `userData/attachments`. */
export const setAttachmentsRoot = (dir: string | null): void => {
  rootOverride = dir;
};

const root = (): string => rootOverride ?? path.join(app.getPath('userData'), 'attachments');
const ticketDir = (ticketId: string) => {
  if (!TICKET_ID_RE.test(ticketId)) throw new Error(`Invalid ticket id "${ticketId}"`);
  return path.join(root(), ticketId);
};
const ownerDir = (ticketId: string, commentId: number | null) =>
  commentId == null
    ? path.join(ticketDir(ticketId), TICKET_DIR)
    : path.join(ticketDir(ticketId), COMMENTS_DIR, String(commentId));

const readDir = async (dir: string): Promise<string[]> => {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
};

const listOwner = async (
  ticketId: string,
  commentId: number | null,
): Promise<Array<PersistedAttachment & { created: number }>> => {
  const dir = ownerDir(ticketId, commentId);
  const out = [];
  for (const name of await readDir(dir)) {
    const mime = mimeOfName(name);
    if (!mime || !NAME_RE.test(name)) continue;
    const st = await fs.stat(path.join(dir, name));
    out.push({ name, mime, size: st.size, created: st.birthtimeMs });
  }
  // Oldest first, so thumbnails keep the order they were added in.
  return out.sort((a, b) => a.created - b.created || a.name.localeCompare(b.name));
};

const commentIdsOf = async (ticketId: string): Promise<number[]> =>
  (await readDir(path.join(ticketDir(ticketId), COMMENTS_DIR)))
    .filter((d) => /^\d+$/.test(d))
    .map(Number);

/** Everything on a ticket that can hold images: the ticket itself (null), then each comment. */
const ownersOf = async (ticketId: string): Promise<Array<number | null>> => [
  null,
  ...(await commentIdsOf(ticketId)),
];

const strip = ({ name, mime, size }: PersistedAttachment): PersistedAttachment => ({
  name,
  mime,
  size,
});

export interface TicketAttachments {
  ticket: PersistedAttachment[];
  comments: Map<number, PersistedAttachment[]>;
}

/** Attachment metadata for the given tickets. Tickets without a folder cost one readdir in total. */
export const listForTickets = async (
  ticketIds: string[],
): Promise<Map<string, TicketAttachments>> => {
  const grouped = new Map<string, TicketAttachments>();
  if (!ticketIds.length) return grouped;
  const present = new Set(await readDir(root()));
  for (const ticketId of ticketIds) {
    if (!present.has(ticketId) || !TICKET_ID_RE.test(ticketId)) continue;
    const comments = new Map<number, PersistedAttachment[]>();
    for (const commentId of await commentIdsOf(ticketId)) {
      const list = await listOwner(ticketId, commentId);
      if (list.length) comments.set(commentId, list.map(strip));
    }
    grouped.set(ticketId, { ticket: (await listOwner(ticketId, null)).map(strip), comments });
  }
  return grouped;
};

/** Every image name in use on a ticket, its comments included. */
export const namesOf = async (ticketId: string): Promise<Set<string>> => {
  const names = new Set<string>();
  for (const owner of await ownersOf(ticketId)) {
    for (const a of await listOwner(ticketId, owner)) names.add(a.name);
  }
  return names;
};

/** Where an image of this ticket lives, or null. */
const locate = async (ticketId: string, name: string): Promise<string | null> => {
  if (!NAME_RE.test(name)) return null;
  for (const commentId of await ownersOf(ticketId)) {
    const file = path.join(ownerDir(ticketId, commentId), name);
    try {
      if ((await fs.stat(file)).isFile()) return file;
    } catch {
      // not in this folder
    }
  }
  return null;
};

/** Write a batch whose names the caller has already checked. All or nothing. */
export const write = async (
  ticketId: string,
  commentId: number | null,
  list: NewAttachment[],
): Promise<PersistedAttachment[]> => {
  if (!list.length) return [];
  const dir = ownerDir(ticketId, commentId);
  await fs.mkdir(dir, { recursive: true });
  const written: string[] = [];
  try {
    for (const a of list) {
      const file = path.join(dir, a.name);
      // 'wx' refuses to overwrite, so a reused name can never clobber another image.
      await fs.writeFile(file, a.data, { flag: 'wx' });
      written.push(file);
    }
  } catch (err) {
    await Promise.all(written.map((f) => fs.rm(f, { force: true })));
    throw err;
  }
  return list.map((a) => ({ name: a.name, mime: a.mime, size: a.data.byteLength }));
};

export const read = async (ticketId: string, name: string): Promise<AttachmentData | null> => {
  if (!TICKET_ID_RE.test(ticketId)) return null;
  const file = await locate(ticketId, name);
  if (!file) return null;
  try {
    return { mime: mimeOfName(name)!, data: new Uint8Array(await fs.readFile(file)) };
  } catch {
    return null;
  }
};

export const remove = async (ticketId: string, name: string): Promise<boolean> => {
  const file = await locate(ticketId, name);
  if (!file) return false;
  await fs.rm(file, { force: true });
  return true;
};

export const removeComment = async (ticketId: string, commentId: number): Promise<void> => {
  await fs.rm(ownerDir(ticketId, commentId), { recursive: true, force: true });
};

export const removeTickets = async (ticketIds: string[]): Promise<void> => {
  for (const ticketId of ticketIds) {
    await fs.rm(ticketDir(ticketId), { recursive: true, force: true });
  }
};

/** Delete every stored image (workspace reset). */
export const clear = async (): Promise<void> => {
  await fs.rm(root(), { recursive: true, force: true });
};

export interface StorageUsage {
  files: number;
  bytes: number;
  /** Files whose ticket or comment no longer exists. */
  unusedFiles: number;
  unusedBytes: number;
}

const folderSize = async (dir: string): Promise<{ files: number; bytes: number }> => {
  let files = 0;
  let bytes = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await folderSize(p);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += (await fs.stat(p)).size;
    }
  }
  return { files, bytes };
};

/**
 * Folders that belong to no live ticket or comment. `live` maps each existing
 * ticket id to the ids of its comments.
 */
const unusedFolders = async (live: Map<string, Set<number>>): Promise<string[]> => {
  const out: string[] = [];
  for (const ticketId of await readDir(root())) {
    const comments = live.get(ticketId);
    if (!comments || !TICKET_ID_RE.test(ticketId)) {
      out.push(path.join(root(), ticketId));
      continue;
    }
    for (const commentId of await commentIdsOf(ticketId)) {
      if (!comments.has(commentId)) out.push(ownerDir(ticketId, commentId));
    }
  }
  return out;
};

/** Total size of the leftover folders, calling `then` on each one after measuring it. */
const measureUnused = async (
  live: Map<string, Set<number>>,
  then: (dir: string) => Promise<void> = async () => {},
): Promise<{ files: number; bytes: number }> => {
  let files = 0;
  let bytes = 0;
  for (const dir of await unusedFolders(live)) {
    const s = await folderSize(dir);
    await then(dir);
    files += s.files;
    bytes += s.bytes;
  }
  return { files, bytes };
};

export const usage = async (live: Map<string, Set<number>>): Promise<StorageUsage> => {
  const all = await folderSize(root());
  const unused = await measureUnused(live);
  return {
    files: all.files,
    bytes: all.bytes,
    unusedFiles: unused.files,
    unusedBytes: unused.bytes,
  };
};

/** Remove images left behind by deleted tickets or comments (or an interrupted save). */
export const cleanUp = async (
  live: Map<string, Set<number>>,
): Promise<{ removedFiles: number; freedBytes: number }> => {
  const removed = await measureUnused(live, (dir) => fs.rm(dir, { recursive: true, force: true }));
  return { removedFiles: removed.files, freedBytes: removed.bytes };
};
