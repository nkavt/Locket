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

export interface PersistedComment {
  id: number;
  author: string;
  ts: string;
  body: string;
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
