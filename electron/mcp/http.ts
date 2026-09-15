import { EventEmitter } from 'node:events';
import * as http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, type McpServerHooks } from './server';

export const MCP_PATH = '/mcp';
export const MCP_HOST = '127.0.0.1';

export interface McpStatus {
  running: boolean;
  port: number | null;
  url: string | null;
}

export interface McpLogLine {
  ts: string;
  line: string;
}

export interface McpHostEvents {
  log: [McpLogLine];
  status: [McpStatus];
}

/**
 * Hosts the MCP server over Streamable HTTP on localhost. Stateless mode: a
 * fresh McpServer + transport per request, so concurrent clients never share
 * request ids.
 */
export class McpHost extends EventEmitter<McpHostEvents> {
  private server: http.Server | null = null;
  private port: number | null = null;

  constructor(private readonly hooks: Omit<McpServerHooks, 'log'>) {
    super();
  }

  status(): McpStatus {
    return {
      running: !!this.server,
      port: this.port,
      url: this.port ? `http://${MCP_HOST}:${this.port}${MCP_PATH}` : null,
    };
  }

  private log(line: string): void {
    this.emit('log', { ts: new Date().toISOString(), line });
  }

  async start(port: number): Promise<McpStatus> {
    if (this.server) {
      if (this.port === port) return this.status();
      await this.stop();
    }
    const allowedHosts = [`${MCP_HOST}:${port}`, `localhost:${port}`];
    const server = http.createServer((req, res) => {
      void this.handle(req, res, allowedHosts);
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, MCP_HOST, () => {
        server.off('error', reject);
        resolve();
      });
    });

    this.server = server;
    this.port = port;
    this.log(`MCP server started on ${this.status().url}`);
    this.emit('status', this.status());
    return this.status();
  }

  async stop(): Promise<McpStatus> {
    const server = this.server;
    if (!server) return this.status();
    this.server = null;
    this.port = null;
    await new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
    this.log('MCP server stopped.');
    this.emit('status', this.status());
    return this.status();
  }

  private async handle(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    allowedHosts: string[],
  ): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? MCP_HOST}`);
    if (url.pathname !== MCP_PATH) {
      res
        .writeHead(404, { 'content-type': 'application/json' })
        .end(JSON.stringify({ error: `Not found. MCP endpoint is ${MCP_PATH}` }));
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedHosts,
    });
    const mcp = createMcpServer({ ...this.hooks, log: (line) => this.log(line) });
    res.on('close', () => {
      void transport.close();
      void mcp.close();
    });

    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log(`error: ${message}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' }).end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message },
            id: null,
          }),
        );
      }
    }
  }
}
