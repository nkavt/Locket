import { contextBridge, ipcRenderer } from 'electron';
import type { PersistedData } from './db';

interface PersistedSettings {
  mcpPort: number;
  workspacePath: string;
}

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
    set: (data: PersistedData): Promise<void> =>
      ipcRenderer.invoke('data:set', data),
  },
});
