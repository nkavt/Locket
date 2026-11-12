import { describe, expect, it, vi } from 'vitest';
import type { McpStatus } from '../mcp/http';
import { buildTrayMenu, trayTooltip } from './menu';

const running: McpStatus = { running: true, port: 7821, url: 'http://127.0.0.1:7821/mcp' };
const stopped: McpStatus = { running: false, port: null, url: null };

const actions = () => ({
  toggleServer: vi.fn(),
  copyUrl: vi.fn(),
  openLocket: vi.fn(),
  quit: vi.fn(),
});

const labels = (status: McpStatus) =>
  buildTrayMenu(status, actions()).map((i) => i.label ?? i.type);

describe('buildTrayMenu', () => {
  it('offers Start while stopped, without a URL to copy', () => {
    expect(labels(stopped)).toEqual([
      'Start server',
      'separator',
      'Open Locket',
      'separator',
      'Quit Locket',
    ]);
    expect(buildTrayMenu(stopped, actions())[0].sublabel).toBe('Stopped');
  });

  it('offers Stop and Copy URL while running, showing the URL', () => {
    expect(labels(running)).toEqual([
      'Stop server',
      'Copy server URL',
      'separator',
      'Open Locket',
      'separator',
      'Quit Locket',
    ]);
    expect(buildTrayMenu(running, actions())[0].sublabel).toBe(
      'Running on http://127.0.0.1:7821/mcp',
    );
  });

  it('badges the server item with the icon for its state', () => {
    const icons = { running: 'on', stopped: 'off' } as never;
    expect(buildTrayMenu(running, actions(), icons)[0].icon).toBe('on');
    expect(buildTrayMenu(stopped, actions(), icons)[0].icon).toBe('off');
  });

  it('wires each item to its action', () => {
    const a = actions();
    const menu = buildTrayMenu(running, a);
    const click = (label: string) => (menu.find((i) => i.label === label)!.click as () => void)();
    click('Stop server');
    click('Copy server URL');
    click('Open Locket');
    click('Quit Locket');
    expect(a.toggleServer).toHaveBeenCalledOnce();
    expect(a.copyUrl).toHaveBeenCalledOnce();
    expect(a.openLocket).toHaveBeenCalledOnce();
    expect(a.quit).toHaveBeenCalledOnce();
  });
});

describe('trayTooltip', () => {
  it('describes the server state', () => {
    expect(trayTooltip(running)).toBe('Locket: MCP server running on http://127.0.0.1:7821/mcp');
    expect(trayTooltip(stopped)).toBe('Locket: MCP server stopped');
  });
});
