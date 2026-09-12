import type { PersistedData, PersistedSettings } from '@/types/electron-api';

type LocketBridge = Window['locket'];

/** In-memory stand-in for the Electron preload bridge (`window.locket`). */
export interface MockLocket {
  bridge: LocketBridge;
  data: PersistedData | null;
  settings: PersistedSettings;
  user: string;
}

const DEFAULT_SETTINGS: PersistedSettings = { mcpPort: 7821, workspacePath: '/tmp/locket' };

export function installMockLocket(
  init: Partial<Pick<MockLocket, 'data' | 'settings' | 'user'>> = {},
): MockLocket {
  const mock: MockLocket = {
    data: init.data ?? null,
    settings: { ...DEFAULT_SETTINGS, ...init.settings },
    user: init.user ?? 'Test User',
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
