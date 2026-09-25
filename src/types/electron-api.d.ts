import type { Comment, Project, Ticket } from '../data/types';

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
        add: (ticketId: string, body: string, author: string) => Promise<Comment>;
        delete: (ticketId: string, commentId: number) => Promise<void>;
      };
      mcp: {
        status: () => Promise<McpStatus>;
        start: (port?: number) => Promise<McpStatus>;
        stop: () => Promise<McpStatus>;
        onStatus: (cb: (status: McpStatus) => void) => Unsubscribe;
        onLog: (cb: (line: McpLogLine) => void) => Unsubscribe;
      };
    };
  }
}

export {};
