import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { initDb, loadData, saveData, withDbLock, type PersistedData } from './db';
import { McpHost } from './mcp/http';

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

const mcp = new McpHost({
  onDataChanged: (data) => broadcast('data:changed', data),
});
mcp.on('log', (line) => broadcast('mcp:log', line));
mcp.on('status', (status) => broadcast('mcp:status', status));

const iconPath = path.join(__dirname, '..', 'build', 'icon.png');

const createWindow = (): void => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
};

app.whenReady().then(async () => {
  // Packaged builds get the icon from the bundle; in dev set the Dock icon by hand.
  if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(iconPath);
  await initDb();

  ipcMain.handle('settings:get', () => readSettings());
  ipcMain.handle('settings:set', (_e, patch: Partial<PersistedSettings>) => writeSettings(patch));
  ipcMain.handle('user:get', () => getOsUserName());
  ipcMain.handle('data:get', () => withDbLock(() => loadData()));
  ipcMain.handle('data:set', (_e, data: PersistedData) => withDbLock(() => saveData(data)));

  ipcMain.handle('mcp:status', () => mcp.status());
  ipcMain.handle('mcp:start', async (_e, port?: number) => {
    const settings = await readSettings();
    const p = port ?? settings.mcpPort;
    validatePatch({ mcpPort: p });
    return mcp.start(p);
  });
  ipcMain.handle('mcp:stop', () => mcp.stop());

  createWindow();

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
