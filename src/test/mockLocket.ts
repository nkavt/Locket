import type { McpLogLine, McpStatus, PersistedData, PersistedSettings } from '@/types/electron-api';

type LocketBridge = Window['locket'];

/** In-memory stand-in for the Electron preload bridge (`window.locket`). */
export interface MockLocket {
  bridge: LocketBridge;
  data: PersistedData | null;
  settings: PersistedSettings;
  user: string;
  mcp: McpStatus;
  dataListeners: Set<(data: PersistedData) => void>;
  statusListeners: Set<(status: McpStatus) => void>;
  logListeners: Set<(line: McpLogLine) => void>;
  /** Simulate the main process pushing changed data / a log line. */
  emitDataChanged: (data: PersistedData) => void;
  emitLog: (line: string) => void;
}

const DEFAULT_SETTINGS: PersistedSettings = { mcpPort: 7821, workspacePath: '/tmp/locket' };

export function installMockLocket(
  init: Partial<Pick<MockLocket, 'data' | 'settings' | 'user'>> = {},
): MockLocket {
  const mock: MockLocket = {
    data: init.data ?? null,
    settings: { ...DEFAULT_SETTINGS, ...init.settings },
    user: init.user ?? 'Test User',
    mcp: { running: false, port: null, url: null },
    dataListeners: new Set(),
    statusListeners: new Set(),
    logListeners: new Set(),
    emitDataChanged: (data) => mock.dataListeners.forEach((l) => l(data)),
    emitLog: (line) => mock.logListeners.forEach((l) => l({ ts: new Date().toISOString(), line })),
    bridge: {
      settings: {
        get: async () => mock.settings,
        set: async (patch) => {
          mock.settings = { ...mock.settings, ...patch };
          return mock.settings;
        },
      },
      user: { get: async () => mock.user },
      data: {
        get: async () => mock.data,
        set: async (data) => {
          mock.data = data;
        },
        onChanged: (cb) => {
          mock.dataListeners.add(cb);
          return () => mock.dataListeners.delete(cb);
        },
      },
      mcp: {
        status: async () => mock.mcp,
        start: async (port) => {
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
        onLog: (cb) => {
          mock.logListeners.add(cb);
          return () => mock.logListeners.delete(cb);
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
