import type { Attachment, Comment, Project, Ticket } from '../data/types';

/** An image about to be saved. The renderer picks the name so markdown can reference it early. */
export interface NewAttachment {
  /** Unique within the ticket (see features/attachments/names.ts). */
  name: string;
  mime: string;
  data: Uint8Array;
}

export interface AttachmentData {
  mime: string;
  data: Uint8Array;
}

export interface AttachmentUsage {
  files: number;
  bytes: number;
  /** Images whose ticket or comment no longer exists. */
  unusedFiles: number;
  unusedBytes: number;
}

export interface PersistedSettings {
  mcpPort: number;
}

export interface PersistedData {
  projects: Project[];
  tickets: Ticket[];
  counters: Record<string, number>;
}

export interface NewProjectInput {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
}

export type ProjectPatch = Partial<Pick<Project, 'name' | 'icon' | 'color' | 'description'>>;

export interface ProjectSummary extends Project {
  ticketCount: number;
}

export interface NewTicketInput {
  projectId: string;
  title: string;
  description?: string;
  status?: Ticket['status'];
  priority?: Ticket['priority'];
  labels?: string[];
  due?: string | null;
  author: string;
  attachments?: NewAttachment[];
}

export type TicketPatch = Partial<
  Pick<Ticket, 'title' | 'description' | 'status' | 'priority' | 'labels' | 'due'>
>;

export interface TicketFilter {
  projectId?: string;
  status?: Ticket['status'];
  priority?: Ticket['priority'];
  label?: string;
  query?: string;
}

export interface McpStatus {
  running: boolean;
  port: number | null;
  url: string | null;
}

export interface McpLogLine {
  ts: string;
  line: string;
}

export type Unsubscribe = () => void;

declare global {
  interface Window {
    locket: {
      settings: {
        get: () => Promise<PersistedSettings>;
        set: (patch: Partial<PersistedSettings>) => Promise<PersistedSettings>;
      };
      user: {
        get: () => Promise<string>;
      };
      data: {
        /** Whole workspace, or null on first run before anything was written. */
        get: () => Promise<PersistedData | null>;
        /** Replace the whole workspace: first-run seeding and reset only. */
        replace: (data: PersistedData) => Promise<void>;
        /** Fires after any change, including ones made by the MCP server. */
        onChanged: (cb: (data: PersistedData) => void) => Unsubscribe;
      };
      /** Per-entity operations backed by the main-process services (shared with MCP). */
      projects: {
        list: () => Promise<ProjectSummary[]>;
        create: (input: NewProjectInput) => Promise<Project>;
        update: (id: string, patch: ProjectPatch) => Promise<Project>;
        delete: (id: string) => Promise<{ deletedTickets: number }>;
      };
      tickets: {
        list: (filter?: TicketFilter) => Promise<Ticket[]>;
        get: (id: string) => Promise<Ticket>;
        create: (input: NewTicketInput) => Promise<Ticket>;
        update: (id: string, patch: TicketPatch) => Promise<Ticket>;
        delete: (id: string) => Promise<void>;
      };
      comments: {
        add: (
          ticketId: string,
          body: string,
          author: string,
          attachments?: NewAttachment[],
        ) => Promise<Comment>;
        delete: (ticketId: string, commentId: number) => Promise<void>;
      };
      attachments: {
        /** Image bytes, or null when the attachment was deleted. */
        get: (ticketId: string, name: string) => Promise<AttachmentData | null>;
        /** Attach images to the ticket itself. */
        add: (ticketId: string, attachments: NewAttachment[]) => Promise<Attachment[]>;
        delete: (ticketId: string, name: string) => Promise<void>;
        /** Disk used by images, including leftovers from deleted tickets or comments. */
        usage: () => Promise<AttachmentUsage>;
        /** Delete leftover images whose ticket or comment no longer exists. */
        cleanUp: () => Promise<{ removedFiles: number; freedBytes: number }>;
      };
      mcp: {
        status: () => Promise<McpStatus>;
        start: (port?: number) => Promise<McpStatus>;
        stop: () => Promise<McpStatus>;
        onStatus: (cb: (status: McpStatus) => void) => Unsubscribe;
        getLogs: () => Promise<McpLogLine[]>;
        clearLogs: () => Promise<void>;
        onLog: (cb: (line: McpLogLine) => void) => Unsubscribe;
        onLogsCleared: (cb: () => void) => Unsubscribe;
      };
    };
  }
}

export {};
