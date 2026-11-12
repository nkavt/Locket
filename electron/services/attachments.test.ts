import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { NewAttachment } from '../db/types';
import { ticketFixture, useTestDb } from '../test/db';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const {
  addTicketAttachments,
  attachmentUsage,
  cleanUpAttachments,
  deleteAttachment,
  getAttachmentData,
  MAX_ATTACHMENT_BYTES,
} = await import('./attachments');
const { addComment, deleteComment } = await import('./comments');
const { createTicket, deleteTicket, getTicket } = await import('./tickets');
const { deleteProject } = await import('./projects');
const { readSnapshot } = await import('./snapshot');
const { ValidationError } = await import('./errors');

const png = (name: string, bytes = [1, 2, 3]): NewAttachment => ({
  name,
  mime: 'image/png',
  data: new Uint8Array(bytes),
});

const names = (list: Array<{ name: string }> | undefined) => list?.map((a) => a.name);

describe('attachments service', () => {
  const dir = useTestDb(() => ({
    projects: [{ id: 'p1', name: 'One', slug: 'one', icon: '', color: '', description: '' }],
    tickets: [ticketFixture({ id: 'one-1', updated: '2000-01-01' })],
    counters: { p1: 1 },
  }));

  it('stores images on a new ticket and serves their bytes by name', async () => {
    const ticket = await createTicket({
      projectId: 'p1',
      title: 'With image',
      author: 'me',
      attachments: [png('shot.png', [9, 8, 7])],
    });
    expect(ticket.attachments).toEqual([{ name: 'shot.png', mime: 'image/png', size: 3 }]);
    expect((await getTicket(ticket.id)).attachments).toEqual(ticket.attachments);
    const data = await getAttachmentData(ticket.id, 'shot.png');
    expect(data?.mime).toBe('image/png');
    expect(Array.from(data!.data)).toEqual([9, 8, 7]);
    // Names belong to their ticket.
    expect(await getAttachmentData('one-1', 'shot.png')).toBeNull();
  });

  it('adds images to an existing ticket and bumps it', async () => {
    const added = await addTicketAttachments('one-1', [png('a.png'), png('b.png')]);
    expect(names(added)).toEqual(['a.png', 'b.png']);
    const ticket = await getTicket('one-1');
    expect(names(ticket.attachments)).toEqual(['a.png', 'b.png']);
    expect(ticket.updated).not.toBe('2000-01-01');
  });

  it('keeps comment images on their comment, apart from the ticket', async () => {
    await addTicketAttachments('one-1', [png('ticket.png')]);
    const c = await addComment('one-1', 'look', 'me', [png('comment.png')]);
    expect(names(c.attachments)).toEqual(['comment.png']);
    const ticket = await getTicket('one-1');
    expect(names(ticket.attachments)).toEqual(['ticket.png']);
    expect(names(ticket.comments[0].attachments)).toEqual(['comment.png']);
    // Any image of the ticket can be fetched by name, whoever holds it.
    expect(await getAttachmentData('one-1', 'comment.png')).not.toBeNull();
  });

  it('never puts image bytes into the snapshot', async () => {
    await addTicketAttachments('one-1', [png('snap.png')]);
    const snap = await readSnapshot();
    expect(snap.tickets[0].attachments).toEqual([{ name: 'snap.png', mime: 'image/png', size: 3 }]);
  });

  it.each([
    ['an unsupported type', { ...png('x.svg'), mime: 'image/svg+xml' }, /Unsupported/],
    ['an empty file', png('empty.png', []), /non-empty/],
    ['an upper-case name', png('Shot.png'), /Invalid image name/],
    ['a name with a path', png('../x.png'), /Invalid image name/],
    ['a name without its extension', png('shot'), /Invalid image name/],
    ['an extension that does not match', png('shot.jpg'), /Invalid image name/],
    [
      'a file over the limit',
      { ...png('big.png'), data: new Uint8Array(MAX_ATTACHMENT_BYTES + 1) },
      /larger than/,
    ],
  ])('rejects %s and writes nothing', async (_label, attachment, message) => {
    const err = await addTicketAttachments('one-1', [attachment]).catch((e: Error) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(String(err)).toMatch(message);
    expect((await getTicket('one-1')).attachments).toEqual([]);
  });

  it('rejects names that are repeated or already used anywhere on the ticket', async () => {
    await expect(addTicketAttachments('one-1', [png('d.png'), png('d.png')])).rejects.toThrow(
      /already on this ticket/,
    );
    await addTicketAttachments('one-1', [png('d.png')]);
    await expect(addComment('one-1', 'x', 'me', [png('d.png')])).rejects.toThrow(
      /already on this ticket/,
    );
    // The failed comment rolled back with its attachment.
    expect((await getTicket('one-1')).comments).toEqual([]);
  });

  it('deletes one image wherever it lives on the ticket', async () => {
    await addTicketAttachments('one-1', [png('t.png')]);
    await addComment('one-1', 'x', 'me', [png('c.png')]);
    await deleteAttachment('one-1', 't.png');
    await deleteAttachment('one-1', 'c.png');
    const ticket = await getTicket('one-1');
    expect(ticket.attachments).toEqual([]);
    expect(ticket.comments[0].attachments).toEqual([]);
    expect(await getAttachmentData('one-1', 't.png')).toBeNull();
    await expect(deleteAttachment('one-1', 't.png')).rejects.toThrow(/not found/);
  });

  it('lays images out under their own names in ticket and comment folders', async () => {
    await addTicketAttachments('one-1', [png('login-screen.png')]);
    const c = await addComment('one-1', 'x', 'me', [png('error-dialog.png')]);
    expect(readdirSync(path.join(dir, 'one-1', 'ticket'))).toEqual(['login-screen.png']);
    expect(readdirSync(path.join(dir, 'one-1', 'comments', String(c.id)))).toEqual([
      'error-dialog.png',
    ]);
  });

  it('refuses ticket ids that would leave the attachments folder', async () => {
    expect(await getAttachmentData('../one-1', 'a.png')).toBeNull();
  });

  it('reports and cleans up only images whose ticket or comment is gone', async () => {
    await addTicketAttachments('one-1', [png('keep.png', [1, 2, 3, 4])]);
    // Leftovers: a folder for a ticket that does not exist, and one for a missing comment.
    mkdirSync(path.join(dir, 'ghost-9', 'ticket'), { recursive: true });
    writeFileSync(path.join(dir, 'ghost-9', 'ticket', 'x.png'), 'xx');
    mkdirSync(path.join(dir, 'one-1', 'comments', '123'), { recursive: true });
    writeFileSync(path.join(dir, 'one-1', 'comments', '123', 'y.png'), 'yyy');

    expect(await attachmentUsage()).toEqual({
      files: 3,
      bytes: 9,
      unusedFiles: 2,
      unusedBytes: 5,
    });
    expect(await cleanUpAttachments()).toEqual({ removedFiles: 2, freedBytes: 5 });
    expect(existsSync(path.join(dir, 'ghost-9'))).toBe(false);
    expect(existsSync(path.join(dir, 'one-1', 'comments', '123'))).toBe(false);
    expect(await getAttachmentData('one-1', 'keep.png')).not.toBeNull();
    expect(await attachmentUsage()).toMatchObject({ files: 1, unusedFiles: 0 });
  });

  it('removes images along with their comment, ticket or project', async () => {
    const c = await addComment('one-1', 'x', 'me', [png('c.png')]);
    await deleteComment('one-1', c.id);
    expect(await getAttachmentData('one-1', 'c.png')).toBeNull();

    await addTicketAttachments('one-1', [png('t.png')]);
    await deleteTicket('one-1');
    expect(await getAttachmentData('one-1', 't.png')).toBeNull();

    const t = await createTicket({
      projectId: 'p1',
      title: 't',
      author: 'me',
      attachments: [png('p.png')],
    });
    expect(t.attachments).toHaveLength(1);
    await deleteProject('p1');
    expect(await getAttachmentData(t.id, 'p.png')).toBeNull();
  });
});
