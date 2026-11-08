import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { McpHost, MCP_PATH, MAX_LOG_LINES } = await import('./http');

const tmpDirs: string[] = [];
const tmpLog = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'locket-mcp-log-'));
  tmpDirs.push(dir);
  return path.join(dir, 'logs', 'mcp.log');
};
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

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
    const host = new McpHost({ onDataChanged }, tmpLog());
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
    const host = new McpHost({}, tmpLog());
    const a = 20000 + Math.floor(Math.random() * 20000);
    const b = a + 1;
    await host.start(a);
    expect((await host.start(a)).port).toBe(a);
    expect((await host.start(b)).port).toBe(b);
    await host.stop();
    expect(await host.stop()).toEqual({ running: false, port: null, url: null });
  });

  it('buffers logs, keeps them on stop and clears them on each start', async () => {
    const host = new McpHost({}, tmpLog());
    const cleared = vi.fn();
    host.on('logsCleared', cleared);
    const a = 20000 + Math.floor(Math.random() * 20000);
    await host.start(a);
    await host.stop();
    expect(host.logs().map((l) => l.line)).toEqual([
      expect.stringMatching(/started/),
      expect.stringMatching(/stopped/),
    ]);

    await host.start(a);
    expect(cleared).toHaveBeenCalledTimes(2);
    expect(host.logs()).toHaveLength(1);
    expect(host.logs()[0].line).toMatch(/started/);

    // Restart on another port also starts a fresh log.
    await host.start(a + 1);
    expect(host.logs().map((l) => l.line)).toEqual([expect.stringMatching(/started/)]);
    await host.stop();

    host.clearLogs();
    expect(host.logs()).toEqual([]);
  });

  it('logs a failed start and caps the buffer', async () => {
    const blocker = new McpHost({}, tmpLog());
    const port = 20000 + Math.floor(Math.random() * 20000);
    await blocker.start(port);
    const host = new McpHost({}, tmpLog());
    try {
      await expect(host.start(port)).rejects.toThrow();
      expect(host.logs().at(-1)?.line).toMatch(/failed to start/);
    } finally {
      await blocker.stop();
    }

    const log = (host as unknown as { log: (l: string) => void }).log.bind(host);
    for (let i = 0; i < MAX_LOG_LINES + 50; i++) log(`line ${i}`);
    expect(host.logs()).toHaveLength(MAX_LOG_LINES);
    expect(host.logs()[0].line).toBe('line 50');
  });

  it('writes the log to a file that survives an app restart and stays bounded', async () => {
    const file = tmpLog();
    const host = new McpHost({}, file);
    const port = 20000 + Math.floor(Math.random() * 20000);
    await host.start(port);
    await host.stop();
    expect(fs.readFileSync(file, 'utf8')).toMatch(
      /^\S+ MCP server started on .*\n\S+ MCP server stopped\.\n$/,
    );

    // A new host on the same file (next app launch) still shows the last run.
    const next = new McpHost({}, file);
    expect(next.logs().map((l) => l.line)).toEqual([
      expect.stringMatching(/started/),
      expect.stringMatching(/stopped/),
    ]);

    const log = (next as unknown as { log: (l: string) => void }).log.bind(next);
    log('multi\nline');
    expect(next.logs().at(-1)?.line).toBe('multi line');
    for (let i = 0; i < MAX_LOG_LINES * 3; i++) log(`line ${i}`);
    const fileLines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
    expect(fileLines).toBeLessThanOrEqual(MAX_LOG_LINES * 2);
    expect(next.logs()).toHaveLength(MAX_LOG_LINES);
    expect(next.logs().at(-1)?.line).toBe(`line ${MAX_LOG_LINES * 3 - 1}`);

    await next.start(port);
    expect(next.logs().map((l) => l.line)).toEqual([expect.stringMatching(/started/)]);
    await next.stop();
  });
});
