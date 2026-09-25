import type { Comment, Project, Ticket } from '@/data/types';
import type {
  NewProjectInput,
  NewTicketInput,
  PersistedData,
  ProjectPatch,
  TicketPatch,
  Unsubscribe,
} from '@/types/electron-api';
import * as local from './localData';

/**
 * Where the workspace lives. In Electron this is the main-process services
 * over IPC (shared with the MCP server); in a plain browser it is localStorage.
 */
export interface DataBackend {
  /** Whole workspace, or null on first run. */
  load(): Promise<PersistedData | null>;
  /** Replace the whole workspace: first-run seeding and reset only. */
  replace(data: PersistedData): Promise<void>;
  createProject(input: NewProjectInput): Promise<Project>;
  updateProject(id: string, patch: ProjectPatch): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  createTicket(input: NewTicketInput): Promise<Ticket>;
  updateTicket(id: string, patch: TicketPatch): Promise<Ticket>;
  deleteTicket(id: string): Promise<void>;
  addComment(ticketId: string, body: string, author: string): Promise<Comment>;
  deleteComment(ticketId: string, commentId: number): Promise<void>;
  /** Changes made elsewhere (MCP tools, other windows). Optional for the browser. */
  onChanged?(cb: (data: PersistedData) => void): Unsubscribe;
}

export const hasElectronBridge = (): boolean =>
  typeof window !== 'undefined' && !!window.locket?.data;

export const electronBackend = (): DataBackend => {
  const { data, projects, tickets, comments } = window.locket;
  return {
    load: () => data.get(),
    replace: (d) => data.replace(d),
    createProject: (input) => projects.create(input),
    updateProject: (id, patch) => projects.update(id, patch),
    deleteProject: async (id) => {
      await projects.delete(id);
    },
    createTicket: (input) => tickets.create(input),
    updateTicket: (id, patch) => tickets.update(id, patch),
    deleteTicket: (id) => tickets.delete(id),
    addComment: (ticketId, body, author) => comments.add(ticketId, body, author),
    deleteComment: (ticketId, commentId) => comments.delete(ticketId, commentId),
    onChanged: (cb) => data.onChanged(cb),
  };
};

export const LOCAL_STORAGE_KEY = 'locket-app-state-v1';

/** localStorage-backed fallback for running the renderer outside Electron. */
export const localBackend = (): DataBackend => {
  let cache: PersistedData | null = null;

  const read = (): PersistedData | null => {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedData>;
        cache = {
          projects: parsed.projects ?? [],
          tickets: parsed.tickets ?? [],
          counters: parsed.counters ?? {},
        };
      }
    } catch {
      // unreadable storage counts as first run
    }
    return cache;
  };

  const write = (d: PersistedData): void => {
    cache = d;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(d));
    } catch {
      // storage may be unavailable; keep the in-memory copy
    }
  };

  const current = (): PersistedData => read() ?? { projects: [], tickets: [], counters: {} };

  return {
    load: async () => read(),
    replace: async (d) => write(d),
    createProject: async (input) => {
      const { data, project } = local.createProject(current(), input);
      write(data);
      return project;
    },
    updateProject: async (id, patch) => {
      const { data, project } = local.updateProject(current(), id, patch);
      write(data);
      return project;
    },
    deleteProject: async (id) => write(local.withoutProject(current(), id)),
    createTicket: async (input) => {
      const { data, ticket } = local.createTicket(current(), input);
      write(data);
      return ticket;
    },
    updateTicket: async (id, patch) => {
      const { data, ticket } = local.updateTicket(current(), id, patch);
      write(data);
      return ticket;
    },
    deleteTicket: async (id) => write(local.withoutTicket(current(), id)),
    addComment: async (ticketId, body, author) => {
      const { data, comment } = local.addComment(current(), ticketId, body, author);
      write(data);
      return comment;
    },
    deleteComment: async (ticketId, commentId) =>
      write(local.withoutComment(current(), ticketId, commentId)),
  };
};
