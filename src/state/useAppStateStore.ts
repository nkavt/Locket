import { useEffect, useMemo, useState } from 'react';
import { INITIAL_DATA } from '@/data/constants';
import { useCurrentUser } from './useCurrentUser';
import type { AppData, Comment, Project, Settings, Ticket } from '@/data/types';

const LS_KEY = 'locket-app-state-v1';

type PersistableData = Omit<AppData, 'settings'>;

const PERSISTED_SETTINGS_KEYS = ['mcpPort', 'workspacePath'] as const;
type PersistedKey = (typeof PERSISTED_SETTINGS_KEYS)[number];

function loadState(): AppData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistableData>;
      return { ...INITIAL_DATA, ...parsed, settings: INITIAL_DATA.settings };
    }
  } catch {
    // fall through
  }
  return INITIAL_DATA;
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
  /** False until the initial load from SQLite (Electron) has finished. */
  hydrated: boolean;
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTicket: (projectId: string, data: Partial<Ticket> & { title: string }) => Ticket | null;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  addComment: (ticketId: string, body: string, author?: string) => void;
  deleteComment: (ticketId: string, commentId: number) => void;
  setSettings: (patch: Partial<Settings>) => void;
  resetData: () => void;
}

const hasDb = (): boolean => typeof window !== 'undefined' && !!window.locket?.data;

/**
 * The single source of truth for app data. Handles persistence to SQLite
 * (Electron) or localStorage (browser). Consume it through
 * `AppStateProvider` and the hooks in `useAppState.ts`, not directly.
 */
export function useAppStateStore(): AppStateApi {
  const [state, setState] = useState<AppData>(loadState);
  const currentUser = useCurrentUser();
  // In Electron, don't persist until the initial load from SQLite has finished,
  // otherwise the default state would overwrite the database.
  const [hydrated, setHydrated] = useState(() => !hasDb());

  useEffect(() => {
    if (!hasDb()) return;
    window.locket.data
      .get()
      .then((persisted) => {
        if (persisted) {
          setState((s) => ({ ...s, ...persisted }));
        }
        // First run: `persisted` is null and the state loaded from
        // localStorage (or INITIAL_DATA) gets written to SQLite by the
        // persist effect below — that is the one-time migration.
        localStorage.removeItem(LS_KEY);
      })
      .catch((err) => {
        console.error('[data] failed to load from database:', err);
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { settings: _omit, ...persistable } = state;
    void _omit;
    if (hasDb()) {
      window.locket.data.set(persistable).catch((err) => {
        console.error('[data] failed to save to database:', err);
      });
    } else {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(persistable));
      } catch {
        // ignore
      }
    }
  }, [state, hydrated]);

  // Data changed outside the renderer (MCP tool calls): adopt it as-is.
  useEffect(() => {
    if (!hasDb() || !window.locket.data.onChanged) return;
    return window.locket.data.onChanged((data) => {
      setState((s) => ({ ...s, ...data }));
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.locket) return;
    void window.locket.settings.get().then((persisted) => {
      setState((s) => ({
        ...s,
        settings: { ...s.settings, ...persisted },
      }));
    });
  }, []);

  const api = useMemo<AppStateApi>(
    () => ({
      state,
      hydrated,
      addProject(p) {
        setState((s) => ({
          ...s,
          projects: [...s.projects, p],
          counters: { ...s.counters, [p.id]: 0 },
        }));
      },
      updateProject(id, patch) {
        setState((s) => ({
          ...s,
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },
      deleteProject(id) {
        setState((s) => ({
          ...s,
          projects: s.projects.filter((p) => p.id !== id),
          tickets: s.tickets.filter((t) => t.projectId !== id),
        }));
      },
      addTicket(projectId, data) {
        const proj = state.projects.find((p) => p.id === projectId);
        if (!proj) return null;
        const next = (state.counters[projectId] || 0) + 1;
        const id = `${proj.slug}-${next}`;
        const today = new Date().toISOString().slice(0, 10);
        const ticket: Ticket = {
          id,
          projectId,
          title: data.title || 'Untitled',
          description: data.description || '',
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          labels: data.labels || [],
          due: data.due || null,
          author: data.author || currentUser,
          created: today,
          updated: today,
          comments: [],
        };
        setState((s) => ({
          ...s,
          tickets: [...s.tickets, ticket],
          counters: { ...s.counters, [projectId]: next },
        }));
        return ticket;
      },
      updateTicket(id, patch) {
        const today = new Date().toISOString().slice(0, 10);
        setState((s) => ({
          ...s,
          tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...patch, updated: today } : t)),
        }));
      },
      deleteTicket(id) {
        setState((s) => ({
          ...s,
          tickets: s.tickets.filter((t) => t.id !== id),
        }));
      },
      addComment(ticketId, body, author = currentUser) {
        const c: Comment = {
          id: Date.now(),
          author,
          ts: new Date().toISOString(),
          body,
        };
        setState((s) => ({
          ...s,
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, comments: [...(t.comments || []), c] } : t,
          ),
        }));
      },
      deleteComment(ticketId, commentId) {
        setState((s) => ({
          ...s,
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  comments: t.comments.filter((c) => c.id !== commentId),
                }
              : t,
          ),
        }));
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
      resetData() {
        localStorage.removeItem(LS_KEY);
        setState(INITIAL_DATA);
      },
    }),
    [state, hydrated, currentUser],
  );

  return api;
}
