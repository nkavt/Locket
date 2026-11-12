import { app, clipboard, dialog, Menu, nativeImage, Tray, type NativeImage } from 'electron';
import type { McpHost, McpStatus } from '../mcp/http';
import { statusDot, trayGlyph, type Bitmap } from './icons';
import { buildTrayMenu, trayTooltip } from './menu';

export interface TrayOptions {
  mcp: McpHost;
  /** Port to start the server on, read fresh from settings each time. */
  getPort: () => Promise<number>;
  /** Show and focus the main window, creating it if needed. */
  openLocket: () => void;
  /** The app icon, used as the tray icon where template images aren't supported. */
  appIconPath: string;
}

const toImage = ({ buffer, width, height }: Bitmap, scaleFactor: number): NativeImage =>
  nativeImage.createFromBitmap(buffer, { width, height, scaleFactor });

const trayIcon = (running: boolean, appIconPath: string): NativeImage => {
  if (process.platform !== 'darwin') {
    return nativeImage.createFromPath(appIconPath).resize({ width: 16, height: 16 });
  }
  const img = toImage(trayGlyph(36, running), 2); // 18pt, the menu bar's icon height
  img.setTemplateImage(true);
  return img;
};

/** Ask before quitting while agents may be connected; quit straight away otherwise. */
const confirmQuit = async (mcp: McpHost): Promise<boolean> => {
  if (!mcp.status().running) return true;
  app.focus({ steal: true });
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Quit', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    message: 'Quit Locket?',
    detail: 'The MCP server is running. Quitting stops it, and connected agents lose access.',
  });
  return response === 0;
};

export const createTray = ({ mcp, getPort, openLocket, appIconPath }: TrayOptions): Tray => {
  const dots = {
    running: toImage(statusDot(20, true), 2),
    stopped: toImage(statusDot(20, false), 2),
  };
  const tray = new Tray(trayIcon(mcp.status().running, appIconPath));

  const toggleServer = async (): Promise<void> => {
    try {
      if (mcp.status().running) await mcp.stop();
      else await mcp.start(await getPort());
    } catch (err) {
      dialog.showErrorBox(
        'Could not start the MCP server',
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const quit = async (): Promise<void> => {
    if (!(await confirmQuit(mcp))) return;
    await mcp.stop();
    app.quit();
  };

  const render = (status: McpStatus): void => {
    tray.setImage(trayIcon(status.running, appIconPath));
    tray.setToolTip(trayTooltip(status));
    tray.setContextMenu(
      Menu.buildFromTemplate(
        buildTrayMenu(
          status,
          {
            toggleServer: () => void toggleServer(),
            copyUrl: () => {
              const { url } = mcp.status();
              if (url) clipboard.writeText(url);
            },
            openLocket,
            quit: () => void quit(),
          },
          dots,
        ),
      ),
    );
  };

  render(mcp.status());
  mcp.on('status', render);
  return tray;
};
