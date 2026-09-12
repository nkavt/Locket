import type { Project, Ticket } from '../data/types';

export interface PersistedSettings {
  mcpPort: number;
  workspacePath: string;
}

export interface PersistedData {
  projects: Project[];
  tickets: Ticket[];
  counters: Record<string, number>;
}

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
      };
    };
  }
}

export {};
