import { useCallback, useEffect, useState } from 'react';
import type { McpLogLine, McpStatus } from '@/types/electron-api';

/** Matches the main-process buffer (`MAX_LOG_LINES` in electron/mcp/http.ts). */
const MAX_LOG_LINES = 1000;
const STOPPED: McpStatus = { running: false, port: null, url: null };

const bridge = () =>
  typeof window !== 'undefined' && window.locket?.mcp ? window.locket.mcp : null;

export interface McpApi {
  /** False when running in a plain browser without the Electron bridge. */
  available: boolean;
  status: McpStatus;
  logs: McpLogLine[];
  /** False until the stored log has been read, so the UI can hold off on "no activity". */
  logsLoaded: boolean;
  start: (port: number) => Promise<McpStatus>;
  stop: () => Promise<McpStatus>;
  clearLogs: () => Promise<void>;
}

/**
 * Live view of the MCP server hosted by the Electron main process. The log is
 * owned by the main process: on mount we load its buffer, then follow new lines
 * (like `tail -f`). The main process caps it and clears it on each server start.
 */
export function useMcp(): McpApi {
  const available = !!bridge();
  const [status, setStatus] = useState<McpStatus>(STOPPED);
  const [logs, setLogs] = useState<McpLogLine[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  useEffect(() => {
    const mcp = bridge();
    if (!mcp) return;
    let active = true;
    // Events that arrive before the snapshot are already part of it (IPC keeps order).
    let loaded = false;
    void mcp.status().then((s) => active && setStatus(s));
    const offStatus = mcp.onStatus(setStatus);
    const offLog = mcp.onLog((line) => {
      if (loaded) setLogs((ls) => [...ls.slice(-(MAX_LOG_LINES - 1)), line]);
    });
    const offCleared = mcp.onLogsCleared(() => {
      if (loaded) setLogs([]);
    });
    void mcp.getLogs().then((lines) => {
      if (!active) return;
      loaded = true;
      setLogs(lines);
      setLogsLoaded(true);
    });
    return () => {
      active = false;
      offStatus();
      offLog();
      offCleared();
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

  const clearLogs = useCallback(async () => {
    await bridge()?.clearLogs();
  }, []);

  return { available, status, logs, logsLoaded, start, stop, clearLogs };
}
