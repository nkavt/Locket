import { useCallback, useEffect, useState } from 'react';
import type { McpLogLine, McpStatus } from '@/types/electron-api';

const MAX_LOG_LINES = 200;
const STOPPED: McpStatus = { running: false, port: null, url: null };

const bridge = () =>
  typeof window !== 'undefined' && window.locket?.mcp ? window.locket.mcp : null;

export interface McpApi {
  /** False when running in a plain browser without the Electron bridge. */
  available: boolean;
  status: McpStatus;
  logs: McpLogLine[];
  start: (port: number) => Promise<McpStatus>;
  stop: () => Promise<McpStatus>;
  clearLogs: () => void;
}

/** Live view of the MCP server hosted by the Electron main process. */
export function useMcp(): McpApi {
  const available = !!bridge();
  const [status, setStatus] = useState<McpStatus>(STOPPED);
  const [logs, setLogs] = useState<McpLogLine[]>([]);

  useEffect(() => {
    const mcp = bridge();
    if (!mcp) return;
    void mcp.status().then(setStatus);
    const offStatus = mcp.onStatus(setStatus);
    const offLog = mcp.onLog((line) => setLogs((ls) => [...ls.slice(-(MAX_LOG_LINES - 1)), line]));
    return () => {
      offStatus();
      offLog();
    };
  }, []);

  const start = useCallback(async (port: number) => {
    const mcp = bridge();
    if (!mcp) return STOPPED;
    const next = await mcp.start(port);
    setStatus(next);
    return next;
  }, []);

  const stop = useCallback(async () => {
    const mcp = bridge();
    if (!mcp) return STOPPED;
    const next = await mcp.stop();
    setStatus(next);
    return next;
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { available, status, logs, start, stop, clearLogs };
}
