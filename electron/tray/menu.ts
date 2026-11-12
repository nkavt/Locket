import type { MenuItemConstructorOptions, NativeImage } from 'electron';
import type { McpStatus } from '../mcp/http';

export interface TrayMenuActions {
  toggleServer: () => void;
  copyUrl: () => void;
  openLocket: () => void;
  quit: () => void;
}

export interface TrayMenuIcons {
  running: NativeImage;
  stopped: NativeImage;
}

/** The tray's context menu for the given server state. Kept free of Electron runtime calls. */
export const buildTrayMenu = (
  status: McpStatus,
  actions: TrayMenuActions,
  icons?: TrayMenuIcons,
): MenuItemConstructorOptions[] => [
  {
    label: status.running ? 'Stop server' : 'Start server',
    sublabel: status.running && status.url ? `Running on ${status.url}` : 'Stopped',
    icon: icons ? (status.running ? icons.running : icons.stopped) : undefined,
    click: actions.toggleServer,
  },
  ...(status.running
    ? [{ label: 'Copy server URL', click: actions.copyUrl } satisfies MenuItemConstructorOptions]
    : []),
  { type: 'separator' },
  { label: 'Open Locket', click: actions.openLocket },
  { type: 'separator' },
  { label: 'Quit Locket', click: actions.quit },
];

export const trayTooltip = (status: McpStatus): string =>
  status.running ? `Locket: MCP server running on ${status.url}` : 'Locket: MCP server stopped';
