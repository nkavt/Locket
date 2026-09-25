import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { readData } from '../db/store';
import type { PersistedData } from '../db/types';

export interface McpServerHooks {
  /** Called after any tool mutates data, with the fresh dataset. */
  onDataChanged?: (data: PersistedData) => void;
  /** Human-readable activity line for the UI log. */
  log?: (line: string) => void;
}

/** Shared services handed to every tool/resource registration. */
export interface McpContext {
  /** Record a human-readable activity line. */
  log: (line: string) => void;
  /** Notify the host that data was mutated. */
  changed: () => Promise<void>;
}

export const createContext = (hooks: McpServerHooks): McpContext => ({
  log: (line) => hooks.log?.(line),
  changed: async () => hooks.onDataChanged?.(await readData()),
});

export const DEFAULT_AUTHOR = 'AI agent';

export const json = (value: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});

export const fail = (message: string): CallToolResult => ({
  isError: true,
  content: [{ type: 'text', text: message }],
});

/** Wrap a tool body so thrown errors become MCP tool errors instead of protocol errors. */
export const guarded =
  <A>(fn: (args: A) => Promise<CallToolResult>) =>
  async (args: A): Promise<CallToolResult> => {
    try {
      return await fn(args);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  };

/** Drop `undefined` entries so optional tool inputs don't overwrite stored fields. */
export const compact = <T extends object>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;
