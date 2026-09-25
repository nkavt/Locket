import { describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { McpHost, MCP_PATH } = await import('./http');

const rpc = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });

describe('McpHost', () => {
  useTestDb(() => ({
    projects: [{ id: 'p1', name: 'One', slug: 'one', icon: '', color: '', description: '' }],
    tickets: [],
    counters: { p1: 0 },
  }));

  it('serves MCP over HTTP on localhost and reports status', async () => {
    const onDataChanged = vi.fn();
    const host = new McpHost({ onDataChanged });
    const logs: string[] = [];
    const statuses: boolean[] = [];
    host.on('log', (l) => logs.push(l.line));
    host.on('status', (s) => statuses.push(s.running));

    expect(host.status()).toEqual({ running: false, port: null, url: null });
    const port = 20000 + Math.floor(Math.random() * 20000);
    const status = await host.start(port);
    expect(status).toEqual({ running: true, port, url: `http://127.0.0.1:${port}${MCP_PATH}` });

    try {
      const init = await rpc(status.url!, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '0' },
        },
      });
      expect(init.status).toBe(200);
      const body = (await init.json()) as { result: { serverInfo: { name: string } } };
      expect(body.result.serverInfo.name).toBe('locket');

      // Stateless mode: a tool call in a fresh request needs no session.
      const call = await rpc(status.url!, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'create_ticket', arguments: { projectId: 'p1', title: 'via http' } },
      });
      expect(call.status).toBe(200);
      const result = (await call.json()) as {
        result: { content: Array<{ text: string }> };
      };
      expect(JSON.parse(result.result.content[0].text)).toMatchObject({ id: 'one-1' });
      expect(onDataChanged).toHaveBeenCalledTimes(1);

      const notFound = await fetch(`http://127.0.0.1:${port}/nope`);
      expect(notFound.status).toBe(404);
    } finally {
      await host.stop();
    }

    expect(host.status().running).toBe(false);
    expect(statuses).toEqual([true, false]);
    expect(logs[0]).toMatch(/started/);
    expect(logs.some((l) => l.includes('tools/call create_ticket'))).toBe(true);
    expect(logs.at(-1)).toMatch(/stopped/);
  });

  it('restarts on a different port and is idempotent on the same one', async () => {
    const host = new McpHost({});
    const a = 20000 + Math.floor(Math.random() * 20000);
    const b = a + 1;
    await host.start(a);
    expect((await host.start(a)).port).toBe(a);
    expect((await host.start(b)).port).toBe(b);
    await host.stop();
    expect(await host.stop()).toEqual({ running: false, port: null, url: null });
  });
});
