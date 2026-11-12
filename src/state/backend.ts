import { attachmentKey, ticketAttachments } from '@/data/attachments';
import type { Attachment, Comment, Project, Ticket } from '@/data/types';
import type {
  NewAttachment,
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
  addComment(
    ticketId: string,
    body: string,
    author: string,
    attachments?: NewAttachment[],
  ): Promise<Comment>;
  deleteComment(ticketId: string, commentId: number): Promise<void>;
  /** Attach images to the ticket itself. */
  addAttachments(ticketId: string, attachments: NewAttachment[]): Promise<Attachment[]>;
  deleteAttachment(ticketId: string, name: string): Promise<void>;
  /** A URL an <img> can show, or null when the image is gone. Cached per image. */
  attachmentUrl(ticketId: string, name: string): Promise<string | null>;
  /** Changes made elsewhere (MCP tools, other windows). Optional for the browser. */
  onChanged?(cb: (data: PersistedData) => void): Unsubscribe;
}

export const hasElectronBridge = (): boolean =>
  typeof window !== 'undefined' && !!window.locket?.data;

export const electronBackend = (): DataBackend => {
  const { data, projects, tickets, comments, attachments } = window.locket;
  // A saved image never changes, so one blob URL per ticket + name lasts until it is deleted.
  const urls = new Map<string, Promise<string | null>>();
  const forget = (key: string) => {
    const url = urls.get(key);
    urls.delete(key);
    void url?.then((u) => u && URL.revokeObjectURL(u));
  };
  // A name frees up when its image, comment or ticket is deleted (here or over MCP) and can
  // then go to a different image, so drop cached URLs the workspace no longer has.
  const prune = (d: PersistedData) => {
    const live = new Set(
      d.tickets.flatMap((t) => ticketAttachments(t).map((a) => attachmentKey(t.id, a.name))),
    );
    for (const key of [...urls.keys()]) if (!live.has(key)) forget(key);
  };
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
    addComment: (ticketId, body, author, files) => comments.add(ticketId, body, author, files),
    deleteComment: (ticketId, commentId) => comments.delete(ticketId, commentId),
    addAttachments: (ticketId, files) => attachments.add(ticketId, files),
    deleteAttachment: async (ticketId, name) => {
      await attachments.delete(ticketId, name);
      forget(attachmentKey(ticketId, name));
    },
    attachmentUrl: (ticketId, name) => {
      const key = attachmentKey(ticketId, name);
      let url = urls.get(key);
      if (!url) {
        url = attachments
          .get(ticketId, name)
          .then((a) =>
            a ? URL.createObjectURL(new Blob([a.data as BlobPart], { type: a.mime })) : null,
          )
          .catch(() => null)
          .then((u) => {
            // Not there (yet): ask again next time rather than remembering the miss.
            if (!u) urls.delete(key);
            return u;
          });
        urls.set(key, url);
      }
      return url;
    },
    onChanged: (cb) =>
      data.onChanged((d) => {
        prune(d);
        cb(d);
      }),
  };
};

const ATTACHMENT_KEY_PREFIX = 'locket-attachment:';

const bytesToDataUrl = (mime: string, bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${mime};base64,${btoa(binary)}`;
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

  // Image bytes sit next to the workspace as data URLs, one key per image.
  const files = new Map<string, string>();
  const saveFiles = (ticketId: string, list: NewAttachment[] = []) => {
    for (const a of list) {
      const url = bytesToDataUrl(a.mime, a.data);
      const key = attachmentKey(ticketId, a.name);
      files.set(key, url);
      try {
        localStorage.setItem(ATTACHMENT_KEY_PREFIX + key, url);
      } catch {
        // quota exceeded: keep it for this session only
      }
    }
  };
  const dropFiles = (keys: string[]) => {
    for (const key of keys) {
      files.delete(key);
      try {
        localStorage.removeItem(ATTACHMENT_KEY_PREFIX + key);
      } catch {
        // storage unavailable
      }
    }
  };
  /** Storage keys of every image on these tickets. */
  const keysOf = (tickets: Ticket[]) =>
    tickets.flatMap((t) => ticketAttachments(t).map((a) => attachmentKey(t.id, a.name)));

  return {
    load: async () => read(),
    replace: async (d) => {
      // Like the database, a replace starts the stored images over.
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith(ATTACHMENT_KEY_PREFIX));
        dropFiles(keys.map((k) => k.slice(ATTACHMENT_KEY_PREFIX.length)));
      } catch {
        // storage unavailable
      }
      files.clear();
      write(d);
    },
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
    deleteProject: async (id) => {
      dropFiles(keysOf(current().tickets.filter((t) => t.projectId === id)));
      write(local.withoutProject(current(), id));
    },
    createTicket: async (input) => {
      const { data, ticket } = local.createTicket(current(), input);
      saveFiles(ticket.id, input.attachments);
      write(data);
      return ticket;
    },
    updateTicket: async (id, patch) => {
      const { data, ticket } = local.updateTicket(current(), id, patch);
      write(data);
      return ticket;
    },
    deleteTicket: async (id) => {
      dropFiles(keysOf(current().tickets.filter((t) => t.id === id)));
      write(local.withoutTicket(current(), id));
    },
    addComment: async (ticketId, body, author, attachments) => {
      const { data, comment } = local.addComment(current(), ticketId, body, author, attachments);
      saveFiles(ticketId, attachments);
      write(data);
      return comment;
    },
    deleteComment: async (ticketId, commentId) => {
      const comment = current()
        .tickets.find((t) => t.id === ticketId)
        ?.comments.find((c) => c.id === commentId);
      dropFiles((comment?.attachments ?? []).map((a) => attachmentKey(ticketId, a.name)));
      write(local.withoutComment(current(), ticketId, commentId));
    },
    addAttachments: async (ticketId, attachments) => {
      if (!current().tickets.some((t) => t.id === ticketId)) {
        throw new Error(`Ticket "${ticketId}" not found`);
      }
      const added = local.attachmentMeta(attachments);
      saveFiles(ticketId, attachments);
      write(local.withTicketAttachments(current(), ticketId, added));
      return added;
    },
    deleteAttachment: async (ticketId, name) => {
      dropFiles([attachmentKey(ticketId, name)]);
      write(local.withoutAttachment(current(), ticketId, name));
    },
    attachmentUrl: async (ticketId, name) => {
      const key = attachmentKey(ticketId, name);
      if (files.has(key)) return files.get(key)!;
      try {
        return localStorage.getItem(ATTACHMENT_KEY_PREFIX + key);
      } catch {
        return null;
      }
    },
  };
};
