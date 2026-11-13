import { app, BrowserWindow, ipcMain, nativeTheme, shell, type Tray } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { initDb } from './db';
import { repairProjectIcons } from './services';
import { registerDataIpc } from './ipc/data';
import { McpHost } from './mcp/http';
import { isAllowedExternalUrl, isDevServerUrl } from './navigation';
import { createTray } from './tray';
import { resolveUserDataDir } from './user-data';
import { readSystemInfo } from './system/info';

// Must run before anything reads userData (settings, DB, MCP log, Chromium storage).
const userDataDir = resolveUserDataDir({
  envDir: process.env.LOCKET_USER_DATA_DIR,
  isPackaged: app.isPackaged,
  appPath: app.getAppPath(),
  cwd: process.cwd(),
});
if (userDataDir) app.setPath('userData', userDataDir);

interface PersistedSettings {
  mcpPort: number;
}

const getSettingsPath = (): string => path.join(app.getPath('userData'), 'settings.json');

const getDefaults = (): PersistedSettings => ({ mcpPort: 7821 });

const writeFile = async (settings: PersistedSettings): Promise<void> => {
  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2) + '\n', 'utf8');
};

const readSettings = async (): Promise<PersistedSettings> => {
  const defaults = getDefaults();
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf8');
    // Only known keys survive, so settings dropped in newer versions fall out of the file.
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return { ...defaults, mcpPort: parsed.mcpPort ?? defaults.mcpPort };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      await writeFile(defaults);
      return defaults;
    }
    console.error('[settings] failed to read, using defaults:', err);
    return defaults;
  }
};

const validatePatch = (patch: Partial<PersistedSettings>): void => {
  if ('mcpPort' in patch) {
    const p = patch.mcpPort;
    if (!Number.isInteger(p) || p! < 1024 || p! > 65535) {
      throw new Error(`Invalid mcpPort: ${p}`);
    }
  }
};

const writeSettings = async (patch: Partial<PersistedSettings>): Promise<PersistedSettings> => {
  validatePatch(patch);
  const current = await readSettings();
  const merged: PersistedSettings = { ...current, ...patch };
  await writeFile(merged);
  return merged;
};

const getOsUserName = async (): Promise<string> => {
  if (process.platform === 'darwin') {
    try {
      const { stdout } = await promisify(execFile)('id', ['-F']);
      const fullName = stdout.trim();
      if (fullName) return fullName;
    } catch {
      // fall back to the login name
    }
  }
  return os.userInfo().username;
};

const broadcast = (channel: string, payload: unknown): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
};

const mcp = new McpHost(
  { onDataChanged: (data) => broadcast('data:changed', data) },
  path.join(app.getPath('userData'), 'logs', 'mcp.log'),
);
mcp.on('log', (line) => broadcast('mcp:log', line));
mcp.on('logsCleared', () => broadcast('mcp:logsCleared', null));
mcp.on('status', (status) => broadcast('mcp:status', status));

const iconPath = path.join(__dirname, '..', 'build', 'icon.png');

// Held so the tray icon isn't garbage-collected out of the menu bar.
let tray: Tray | null = null;

const createWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    // Hidden until the page has painted its themed background (see index.html), so no white
    // frame shows. The colour covers any gap before that; it follows the system because the
    // in-app theme choice lives in the renderer's localStorage. Keep in sync with src/theme.ts.
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0e1014' : '#fafafa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.once('ready-to-show', () => win.show());

  // The app never leaves its own page: links open in the OS, and only for safe protocols.
  const openExternal = (url: string): void => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isDevServerUrl(url, process.env.VITE_DEV_SERVER_URL)) return;
    event.preventDefault();
    openExternal(url);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  return win;
};

/** Show and focus the main window, creating it if it was closed. */
const openLocket = (): void => {
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
  } else {
    // A new window shows itself on ready-to-show, which also focuses it.
    createWindow();
  }
  app.focus({ steal: true });
};

app.whenReady().then(async () => {
  // Packaged builds get the icon from the bundle; in dev set the Dock icon by hand.
  if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(iconPath);
  await initDb();
  const repaired = await repairProjectIcons().catch((err) => {
    console.error('[projects] failed to check icons:', err);
    return [];
  });
  if (repaired.length) console.log(`[projects] reset unknown icons on ${repaired.join(', ')}`);

  ipcMain.handle('settings:get', () => readSettings());
  ipcMain.handle('settings:set', (_e, patch: Partial<PersistedSettings>) => writeSettings(patch));
  ipcMain.handle('user:get', () => getOsUserName());
  ipcMain.handle('system:info', () => readSystemInfo());
  registerDataIpc((data) => broadcast('data:changed', data));

  ipcMain.handle('mcp:status', () => mcp.status());
  ipcMain.handle('mcp:start', async (_e, port?: number) => {
    const settings = await readSettings();
    const p = port ?? settings.mcpPort;
    validatePatch({ mcpPort: p });
    return mcp.start(p);
  });
  ipcMain.handle('mcp:stop', () => mcp.stop());
  ipcMain.handle('mcp:getLogs', () => mcp.logs());
  ipcMain.handle('mcp:clearLogs', () => mcp.clearLogs());

  createWindow();
  tray = createTray({
    mcp,
    getPort: async () => (await readSettings()).mcpPort,
    openLocket,
    appIconPath: iconPath,
  });

  // Handy for scripted testing: LOCKET_MCP_AUTOSTART=1 electron .
  if (process.env.LOCKET_MCP_AUTOSTART) {
    const { mcpPort } = await readSettings();
    mcp.start(mcpPort).catch((err) => console.error('[mcp] autostart failed:', err));
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  void mcp.stop();
});

app.on('will-quit', () => {
  tray?.destroy();
  tray = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
