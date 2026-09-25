import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS } from '@/data/constants';
import { welcomeData } from '@/data/welcome';
import {
  electronBackend,
  hasElectronBridge,
  localBackend,
  LOCAL_STORAGE_KEY,
  type DataBackend,
} from './backend';
import * as apply from './localData';
import { useCurrentUser } from './useCurrentUser';
import type { AppData, Project, Settings, Ticket } from '@/data/types';
import type {
  NewProjectInput,
  PersistedData,
  ProjectPatch,
  TicketPatch,
} from '@/types/electron-api';

const PERSISTED_SETTINGS_KEYS = ['mcpPort', 'workspacePath'] as const;
type PersistedKey = (typeof PERSISTED_SETTINGS_KEYS)[number];

const EMPTY_STATE: AppData = {
  projects: [],
  tickets: [],
  counters: {},
  settings: DEFAULT_SETTINGS,
};

/** One-time migration: state saved by the pre-SQLite renderer, if any. */
function readLegacyLocalStorage(): PersistedData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedData>;
    return {
      projects: parsed.projects ?? [],
      tickets: parsed.tickets ?? [],
      counters: parsed.counters ?? {},
    };
  } catch {
    return null;
  }
}

function pickPersisted(patch: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};
  for (const key of PERSISTED_SETTINGS_KEYS) {
    if (key in patch) {
      out[key] = patch[key] as never;
    }
  }
  return out;
}

export interface AppStateApi {
  state: AppData;
  /** False until the initial load from the backend has finished. */
  hydrated: boolean;
  addProject: (input: NewProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: ProjectPatch) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTicket: (
    projectId: string,
    data: Partial<Omit<Ticket, 'id' | 'projectId'>> & { title: string },
  ) => Promise<Ticket>;
  updateTicket: (id: string, patch: TicketPatch) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  addComment: (ticketId: string, body: string, author?: string) => Promise<void>;
  deleteComment: (ticketId: string, commentId: number) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
  resetData: () => Promise<void>;
}

/**
 * The single source of truth for app data. Every mutation is decided by the
 * backend (main-process services in Electron, localStorage in a browser) and
 * the returned entity is folded into React state. Consume it through
 * `AppStateProvider` and the hooks in `useAppState.ts`, not directly.
 */
export function useAppStateStore(): AppStateApi {
  const [be] = useState<DataBackend>(() =>
    hasElectronBridge() ? electronBackend() : localBackend(),
  );

  const [state, setState] = useState<AppData>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const currentUser = useCurrentUser();

  const patchData = (fn: (d: PersistedData) => PersistedData) =>
    setState((s) => ({ ...fn(s), settings: s.settings }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data = await be.load();
        if (!data) {
          // First run: seed from the legacy localStorage payload or the welcome project.
          data = readLegacyLocalStorage() ?? welcomeData();
          await be.replace(data);
        }
        if (hasElectronBridge()) localStorage.removeItem(LOCAL_STORAGE_KEY);
        if (!cancelled) patchData(() => data);
      } catch (err) {
        console.error('[data] failed to load:', err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [be]);

  // Data changed outside this renderer (MCP tool calls, other windows): adopt it as-is.
  useEffect(() => be.onChanged?.((data) => patchData(() => data)), [be]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.locket) return;
    void window.locket.settings.get().then((persisted) => {
      setState((s) => ({ ...s, settings: { ...s.settings, ...persisted } }));
    });
  }, []);

  const api = useMemo<AppStateApi>(
    () => ({
      state,
      hydrated,
      async addProject(input) {
        const project = await be.createProject(input);
        patchData((d) => apply.withProject(d, project));
        return project;
      },
      async updateProject(id, patch) {
        const project = await be.updateProject(id, patch);
        patchData((d) => apply.withProject(d, project));
      },
      async deleteProject(id) {
        await be.deleteProject(id);
        patchData((d) => apply.withoutProject(d, id));
      },
      async addTicket(projectId, data) {
        const ticket = await be.createTicket({
          projectId,
          title: data.title || 'Untitled',
          description: data.description,
          status: data.status,
          priority: data.priority,
          labels: data.labels,
          due: data.due,
          author: data.author || currentUser,
        });
        patchData((d) => ({
          ...apply.withTicket(d, ticket),
          counters: { ...d.counters, [projectId]: (d.counters[projectId] || 0) + 1 },
        }));
        return ticket;
      },
      async updateTicket(id, patch) {
        const ticket = await be.updateTicket(id, patch);
        patchData((d) => apply.withTicket(d, ticket));
      },
      async deleteTicket(id) {
        await be.deleteTicket(id);
        patchData((d) => apply.withoutTicket(d, id));
      },
      async addComment(ticketId, body, author = currentUser) {
        const comment = await be.addComment(ticketId, body, author);
        patchData((d) => apply.withComment(d, ticketId, comment));
      },
      async deleteComment(ticketId, commentId) {
        await be.deleteComment(ticketId, commentId);
        patchData((d) => apply.withoutComment(d, ticketId, commentId));
      },
      setSettings(patch) {
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
        const persisted = pickPersisted(patch);
        if (Object.keys(persisted).length > 0 && typeof window !== 'undefined' && window.locket) {
          void window.locket.settings.set(
            persisted as Partial<{
              [K in PersistedKey]: Settings[K];
            }>,
          );
        }
      },
      async resetData() {
        const data = welcomeData();
        await be.replace(data);
        patchData(() => data);
      },
    }),
    [state, hydrated, currentUser, be],
  );

  return api;
}
