import { ipcMain } from 'electron';
import type {
  NewAttachment,
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

  ipcMain.handle(
    'comments:add',
    async (_e, ticketId: string, body: string, author: string, attachments?: NewAttachment[]) =>
      changed(await services.addComment(ticketId, body, author, attachments)),
  );
  ipcMain.handle('comments:delete', async (_e, ticketId: string, commentId: number) =>
    changed(await services.deleteComment(ticketId, commentId)),
  );

  // Image bytes are fetched one at a time on demand; snapshots only carry metadata.
  ipcMain.handle('attachments:get', (_e, ticketId: string, name: string) =>
    services.getAttachmentData(ticketId, name),
  );
  ipcMain.handle('attachments:add', async (_e, ticketId: string, attachments: NewAttachment[]) =>
    changed(await services.addTicketAttachments(ticketId, attachments)),
  );
  ipcMain.handle('attachments:delete', async (_e, ticketId: string, name: string) =>
    changed(await services.deleteAttachment(ticketId, name)),
  );
  // Settings: disk usage and a manual sweep of images whose ticket or comment is gone.
  ipcMain.handle('attachments:usage', () => services.attachmentUsage());
  ipcMain.handle('attachments:cleanUp', () => services.cleanUpAttachments());
}
