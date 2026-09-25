import { ipcMain } from 'electron';
import type {
  NewProjectInput,
  NewTicketInput,
  PersistedData,
  ProjectPatch,
  TicketFilter,
  TicketPatch,
} from '../db/types';
import * as services from '../services';

/**
 * Renderer-facing data API. Every mutation goes through the same services the
 * MCP tools use, so both sides share validation, id assignment and cascades.
 * `notify` receives the fresh snapshot after each mutation so every window
 * (not just the one that asked) can adopt it.
 */
export function registerDataIpc(notify: (data: PersistedData) => void): void {
  const changed = async <T>(result: T): Promise<T> => {
    notify(await services.readSnapshot());
    return result;
  };

  // Whole-workspace access: hydration, first-run seeding and reset only.
  ipcMain.handle('data:get', () => services.readSnapshotIfInitialized());
  ipcMain.handle('data:replace', async (_e, data: PersistedData) =>
    changed(await services.replaceSnapshot(data)),
  );

  ipcMain.handle('projects:list', () => services.listProjects());
  ipcMain.handle('projects:create', async (_e, input: NewProjectInput) =>
    changed(await services.createProject(input)),
  );
  ipcMain.handle('projects:update', async (_e, id: string, patch: ProjectPatch) =>
    changed(await services.updateProject(id, patch)),
  );
  ipcMain.handle('projects:delete', async (_e, id: string) =>
    changed(await services.deleteProject(id)),
  );

  ipcMain.handle('tickets:list', (_e, filter?: TicketFilter) => services.listTickets(filter));
  ipcMain.handle('tickets:get', (_e, id: string) => services.getTicket(id));
  ipcMain.handle('tickets:create', async (_e, input: NewTicketInput) =>
    changed(await services.createTicket(input)),
  );
  ipcMain.handle('tickets:update', async (_e, id: string, patch: TicketPatch) =>
    changed(await services.updateTicket(id, patch)),
  );
  ipcMain.handle('tickets:delete', async (_e, id: string) =>
    changed(await services.deleteTicket(id)),
  );

  ipcMain.handle('comments:add', async (_e, ticketId: string, body: string, author: string) =>
    changed(await services.addComment(ticketId, body, author)),
  );
  ipcMain.handle('comments:delete', async (_e, ticketId: string, commentId: number) =>
    changed(await services.deleteComment(ticketId, commentId)),
  );
}
