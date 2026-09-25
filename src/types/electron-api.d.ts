import type { Project, Ticket } from '../data/types';

export interface PersistedSettings {
  mcpPort: number;
}

export interface PersistedData {
  projects: Project[];
  tickets: Ticket[];
  counters: Record<string, number>;
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
        get: () => Promise<PersistedData | null>;
        set: (data: PersistedData) => Promise<void>;
        /** Fires when the MCP server (or anything outside the renderer) changed the data. */
        onChanged: (cb: (data: PersistedData) => void) => Unsubscribe;
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
