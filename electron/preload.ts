import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { PersistedData } from './db';
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
    set: (data: PersistedData): Promise<void> => ipcRenderer.invoke('data:set', data),
    /** Fires when something other than the renderer (e.g. the MCP server) changed the data. */
    onChanged: (cb: (data: PersistedData) => void): Unsubscribe =>
      subscribe<PersistedData>('data:changed', cb),
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
