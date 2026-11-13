import type { Attachment, Ticket } from '@/data/types';
import type {
  AttachmentData,
  McpLogLine,
  McpStatus,
  NewAttachment,
  PersistedData,
  PersistedSettings,
  SystemInfo,
} from '@/types/electron-api';

type LocketBridge = Window['locket'];

/** In-memory stand-in for the Electron preload bridge (`window.locket`). */
export interface MockLocket {
  bridge: LocketBridge;
  data: PersistedData | null;
  /** Saved image bytes by "<ticketId>/<name>". */
  files: Map<string, AttachmentData>;
  settings: PersistedSettings;
  user: string;
  mcp: McpStatus;
  dataListeners: Set<(data: PersistedData) => void>;
  statusListeners: Set<(status: McpStatus) => void>;
  logListeners: Set<(line: McpLogLine) => void>;
  logsClearedListeners: Set<() => void>;
  /** The main-process log buffer: cleared on start, kept on stop. */
  logs: McpLogLine[];
  /** Simulate the main process pushing changed data / a log line. */
  emitDataChanged: (data: PersistedData) => void;
  emitLog: (line: string) => void;
}

const DEFAULT_SETTINGS: PersistedSettings = { mcpPort: 7821 };

export const MOCK_SYSTEM_INFO: SystemInfo = {
  platform: 'darwin',
  arch: 'arm64',
  osVersion: '26.7',
  versions: { electron: '45.2.3', node: '22.20.0' },
};

export function installMockLocket(
  init: Partial<Pick<MockLocket, 'data' | 'settings' | 'user'>> = {},
): MockLocket {
  /** The entity APIs operate on `mock.data`, creating an empty dataset on first write. */
  const clearLogs = () => {
    mock.logs = [];
    mock.logsClearedListeners.forEach((l) => l());
  };
  const data = (): PersistedData => (mock.data ??= { projects: [], tickets: [], counters: {} });
  /** Keep the bytes for `attachments.get` and return the metadata the store sees. */
  const store = (ticketId: string, list: NewAttachment[] = []): Attachment[] =>
    list.map((a) => {
      mock.files.set(`${ticketId}/${a.name}`, { mime: a.mime, data: a.data });
      return { name: a.name, mime: a.mime, size: a.data.byteLength };
    });
  const mock: MockLocket = {
    files: new Map(),
    data: init.data ?? null,
    settings: { ...DEFAULT_SETTINGS, ...init.settings },
    user: init.user ?? 'Test User',
    mcp: { running: false, port: null, url: null },
    dataListeners: new Set(),
    statusListeners: new Set(),
    logListeners: new Set(),
    logsClearedListeners: new Set(),
    logs: [],
    emitDataChanged: (data) => mock.dataListeners.forEach((l) => l(data)),
    emitLog: (line) => {
      const entry = { ts: new Date().toISOString(), line };
      mock.logs.push(entry);
      mock.logListeners.forEach((l) => l(entry));
    },
    bridge: {
      settings: {
        get: async () => mock.settings,
        set: async (patch) => {
          mock.settings = { ...mock.settings, ...patch };
          return mock.settings;
        },
      },
      user: { get: async () => mock.user },
      system: { info: async () => MOCK_SYSTEM_INFO },
      data: {
        get: async () => mock.data,
        replace: async (data) => {
          mock.data = structuredClone(data);
        },
        onChanged: (cb) => {
          mock.dataListeners.add(cb);
          return () => mock.dataListeners.delete(cb);
        },
      },
      projects: {
        list: async () =>
          data().projects.map((p) => ({
            ...p,
            ticketCount: data().tickets.filter((t) => t.projectId === p.id).length,
          })),
        create: async (input) => {
          const project = {
            id: `${input.slug}-mock`,
            name: input.name,
            slug: input.slug,
            icon: input.icon ?? 'rocket_launch',
            color: input.color ?? '#1976d2',
            description: input.description ?? '',
          };
          data().projects.push(project);
          data().counters[project.id] = 0;
          return project;
        },
        update: async (id, patch) => {
          const project = data().projects.find((p) => p.id === id);
          if (!project) throw new Error(`Project "${id}" not found`);
          Object.assign(project, patch);
          return project;
        },
        delete: async (id) => {
          const d = data();
          const before = d.tickets.length;
          d.projects = d.projects.filter((p) => p.id !== id);
          d.tickets = d.tickets.filter((t) => t.projectId !== id);
          delete d.counters[id];
          return { deletedTickets: before - d.tickets.length };
        },
      },
      tickets: {
        list: async (filter = {}) =>
          data().tickets.filter(
            (t) =>
              (!filter.projectId || t.projectId === filter.projectId) &&
              (!filter.status || t.status === filter.status) &&
              (!filter.priority || t.priority === filter.priority) &&
              (!filter.label || t.labels.includes(filter.label)),
          ),
        get: async (id) => {
          const ticket = data().tickets.find((t) => t.id === id);
          if (!ticket) throw new Error(`Ticket "${id}" not found`);
          return ticket;
        },
        create: async (input) => {
          const d = data();
          const project = d.projects.find((p) => p.id === input.projectId);
          if (!project) throw new Error(`Project "${input.projectId}" not found`);
          const next = (d.counters[project.id] || 0) + 1;
          const today = new Date().toISOString().slice(0, 10);
          const ticket = {
            id: `${project.slug}-${next}`,
            projectId: project.id,
            title: input.title,
            description: input.description ?? '',
            status: input.status ?? 'todo',
            priority: input.priority ?? 'medium',
            labels: input.labels ?? [],
            due: input.due ?? null,
            author: input.author,
            created: today,
            updated: today,
            comments: [],
            attachments: store(`${project.slug}-${next}`, input.attachments),
          } satisfies Ticket;
          d.tickets.push(ticket);
          d.counters[project.id] = next;
          return ticket;
        },
        update: async (id, patch) => {
          const ticket = data().tickets.find((t) => t.id === id);
          if (!ticket) throw new Error(`Ticket "${id}" not found`);
          Object.assign(ticket, patch, { updated: new Date().toISOString().slice(0, 10) });
          return ticket;
        },
        delete: async (id) => {
          const d = data();
          d.tickets = d.tickets.filter((t) => t.id !== id);
        },
      },
      comments: {
        add: async (ticketId, body, author, attachments) => {
          const ticket = data().tickets.find((t) => t.id === ticketId);
          if (!ticket) throw new Error(`Ticket "${ticketId}" not found`);
          const comment = {
            id: Date.now(),
            author,
            ts: new Date().toISOString(),
            body,
            attachments: store(ticketId, attachments),
          };
          ticket.comments.push(comment);
          return comment;
        },
        delete: async (ticketId, commentId) => {
          const ticket = data().tickets.find((t) => t.id === ticketId);
          if (!ticket) throw new Error(`Ticket "${ticketId}" not found`);
          ticket.comments = ticket.comments.filter((c) => c.id !== commentId);
        },
      },
      attachments: {
        get: async (ticketId, name) => mock.files.get(`${ticketId}/${name}`) ?? null,
        add: async (ticketId, attachments) => {
          const ticket = data().tickets.find((t) => t.id === ticketId);
          if (!ticket) throw new Error(`Ticket "${ticketId}" not found`);
          const added = store(ticketId, attachments);
          ticket.attachments = [...(ticket.attachments ?? []), ...added];
          return added;
        },
        usage: async () => ({
          files: mock.files.size,
          bytes: [...mock.files.values()].reduce((n, f) => n + f.data.byteLength, 0),
          unusedFiles: 0,
          unusedBytes: 0,
        }),
        cleanUp: async () => ({ removedFiles: 0, freedBytes: 0 }),
        delete: async (ticketId, name) => {
          mock.files.delete(`${ticketId}/${name}`);
          for (const t of data().tickets.filter((x) => x.id === ticketId)) {
            t.attachments = t.attachments?.filter((a) => a.name !== name);
            for (const c of t.comments) {
              c.attachments = c.attachments?.filter((a) => a.name !== name);
            }
          }
        },
      },
      mcp: {
        status: async () => mock.mcp,
        start: async (port) => {
          clearLogs();
          mock.mcp = {
            running: true,
            port: port ?? mock.settings.mcpPort,
            url: `http://127.0.0.1:${port ?? mock.settings.mcpPort}/mcp`,
          };
          mock.statusListeners.forEach((l) => l(mock.mcp));
          return mock.mcp;
        },
        stop: async () => {
          mock.mcp = { running: false, port: null, url: null };
          mock.statusListeners.forEach((l) => l(mock.mcp));
          return mock.mcp;
        },
        onStatus: (cb) => {
          mock.statusListeners.add(cb);
          return () => mock.statusListeners.delete(cb);
        },
        getLogs: async () => [...mock.logs],
        clearLogs: async () => clearLogs(),
        onLog: (cb) => {
          mock.logListeners.add(cb);
          return () => mock.logListeners.delete(cb);
        },
        onLogsCleared: (cb) => {
          mock.logsClearedListeners.add(cb);
          return () => mock.logsClearedListeners.delete(cb);
        },
      },
    },
  };
  Object.defineProperty(window, 'locket', {
    value: mock.bridge,
    configurable: true,
    writable: true,
  });
  return mock;
}

export function uninstallMockLocket() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).locket;
}
