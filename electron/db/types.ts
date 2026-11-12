// Plain shapes that cross process boundaries (services, IPC, preload, MCP).
// Deliberately free of TypeORM so the renderer and tests can use them as-is.

export interface PersistedProject {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}

/** An image stored with a ticket or a comment. The bytes travel separately (see `AttachmentData`). */
export interface PersistedAttachment {
  /** Unique within the ticket; markdown shows it with `![](<name>)`. */
  name: string;
  mime: string;
  size: number;
}

/** An image being added. The caller picks the name so markdown can reference it before saving. */
export interface NewAttachment {
  name: string;
  mime: string;
  data: Uint8Array;
}

export interface AttachmentData {
  mime: string;
  data: Uint8Array;
}

export interface PersistedComment {
  id: number;
  author: string;
  ts: string;
  body: string;
  /** Always filled when read from the database; optional so older payloads still load. */
  attachments?: PersistedAttachment[];
}

export interface PersistedTicket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  labels: string[];
  due: string | null;
  author: string;
  created: string;
  updated: string;
  comments: PersistedComment[];
  /** Images attached to the ticket itself (not to its comments). Always filled when read. */
  attachments?: PersistedAttachment[];
}

/** The whole workspace as one document, which is how it is loaded and saved. */
export interface PersistedData {
  projects: PersistedProject[];
  tickets: PersistedTicket[];
  counters: Record<string, number>;
}

export interface NewProjectInput {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
}

/** Editable project fields. The slug is immutable once tickets carry it. */
export type ProjectPatch = Partial<
  Pick<PersistedProject, 'name' | 'icon' | 'color' | 'description'>
>;

export const SLUG_RE = /^[a-z0-9-]{2,12}$/;

export interface NewTicketInput {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  due?: string | null;
  author: string;
  attachments?: NewAttachment[];
}

export type TicketPatch = Partial<
  Pick<PersistedTicket, 'title' | 'description' | 'status' | 'priority' | 'labels' | 'due'>
>;

export interface TicketFilter {
  projectId?: string;
  status?: string;
  priority?: string;
  /** Only tickets carrying this label. */
  label?: string;
  /** Case-insensitive substring over title, id and labels. */
  query?: string;
}
