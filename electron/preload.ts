import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  NewProjectInput,
  NewTicketInput,
  PersistedComment,
  PersistedData,
  PersistedProject,
  PersistedTicket,
  ProjectPatch,
  TicketFilter,
  TicketPatch,
} from './db/types';
import type { ProjectSummary } from './services';
import type { McpLogLine, McpStatus } from './mcp/http';

interface PersistedSettings {
  mcpPort: number;
  workspacePath: string;
}

type Unsubscribe = () => void;

const subscribe = <T>(channel: string, cb: (payload: T) => void): Unsubscribe => {
  const listener = (_e: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.off(channel, listener);
};

contextBridge.exposeInMainWorld('locket', {
  settings: {
    get: (): Promise<PersistedSettings> => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<PersistedSettings>): Promise<PersistedSettings> =>
      ipcRenderer.invoke('settings:set', patch),
  },
  user: {
    get: (): Promise<string> => ipcRenderer.invoke('user:get'),
  },
  data: {
    get: (): Promise<PersistedData | null> => ipcRenderer.invoke('data:get'),
    /** Replace the whole workspace: first-run seeding and reset only. */
    replace: (data: PersistedData): Promise<void> => ipcRenderer.invoke('data:replace', data),
    /** Fires after any change made outside this renderer call (MCP tools, other windows). */
    onChanged: (cb: (data: PersistedData) => void): Unsubscribe =>
      subscribe<PersistedData>('data:changed', cb),
  },
  projects: {
    list: (): Promise<ProjectSummary[]> => ipcRenderer.invoke('projects:list'),
    create: (input: NewProjectInput): Promise<PersistedProject> =>
      ipcRenderer.invoke('projects:create', input),
    update: (id: string, patch: ProjectPatch): Promise<PersistedProject> =>
      ipcRenderer.invoke('projects:update', id, patch),
    delete: (id: string): Promise<{ deletedTickets: number }> =>
      ipcRenderer.invoke('projects:delete', id),
  },
  tickets: {
    list: (filter?: TicketFilter): Promise<PersistedTicket[]> =>
      ipcRenderer.invoke('tickets:list', filter),
    get: (id: string): Promise<PersistedTicket> => ipcRenderer.invoke('tickets:get', id),
    create: (input: NewTicketInput): Promise<PersistedTicket> =>
      ipcRenderer.invoke('tickets:create', input),
    update: (id: string, patch: TicketPatch): Promise<PersistedTicket> =>
      ipcRenderer.invoke('tickets:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tickets:delete', id),
  },
  comments: {
    add: (ticketId: string, body: string, author: string): Promise<PersistedComment> =>
      ipcRenderer.invoke('comments:add', ticketId, body, author),
    delete: (ticketId: string, commentId: number): Promise<void> =>
      ipcRenderer.invoke('comments:delete', ticketId, commentId),
  },
  mcp: {
    status: (): Promise<McpStatus> => ipcRenderer.invoke('mcp:status'),
    start: (port?: number): Promise<McpStatus> => ipcRenderer.invoke('mcp:start', port),
    stop: (): Promise<McpStatus> => ipcRenderer.invoke('mcp:stop'),
    onStatus: (cb: (status: McpStatus) => void): Unsubscribe =>
      subscribe<McpStatus>('mcp:status', cb),
    onLog: (cb: (line: McpLogLine) => void): Unsubscribe => subscribe<McpLogLine>('mcp:log', cb),
  },
});
