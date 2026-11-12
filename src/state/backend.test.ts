import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMockLocket } from '@/test/mockLocket';
import { electronBackend } from './backend';

const ticket = {
  id: 'p-1',
  projectId: 'p',
  title: 'T',
  description: '',
  status: 'todo' as const,
  priority: 'medium' as const,
  labels: [],
  due: null,
  author: 'me',
  created: '2026-01-01',
  updated: '2026-01-01',
  comments: [],
};

describe('electron backend image URLs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the new image when a freed name is reused', async () => {
    let n = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => `blob:${++n}`,
      revokeObjectURL: vi.fn(),
    });
    const mock = installMockLocket({ data: { projects: [], tickets: [ticket], counters: {} } });
    const be = electronBackend();
    be.onChanged!(() => {});
    const png = (byte: number) => ({
      name: 'a.png',
      mime: 'image/png',
      data: new Uint8Array([byte]),
    });

    await be.addAttachments('p-1', [png(1)]);
    expect(await be.attachmentUrl('p-1', 'a.png')).toBe('blob:1');
    expect(await be.attachmentUrl('p-1', 'a.png')).toBe('blob:1');

    // Deleted elsewhere (e.g. over MCP): the workspace no longer lists it.
    await mock.bridge.attachments.delete('p-1', 'a.png');
    mock.emitDataChanged(structuredClone(mock.data!));
    await be.addAttachments('p-1', [png(2)]);
    expect(await be.attachmentUrl('p-1', 'a.png')).toBe('blob:2');
  });

  it('does not remember a miss, so an image added later still shows', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() });
    installMockLocket({ data: { projects: [], tickets: [ticket], counters: {} } });
    const be = electronBackend();
    expect(await be.attachmentUrl('p-1', 'later.png')).toBeNull();
    await be.addAttachments('p-1', [
      { name: 'later.png', mime: 'image/png', data: new Uint8Array([1]) },
    ]);
    expect(await be.attachmentUrl('p-1', 'later.png')).toBe('blob:x');
  });
});
