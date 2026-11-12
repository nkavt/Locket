import { describe, expect, it } from 'vitest';
import {
  attachmentMarkdown,
  attachmentNameOf,
  insertAtCursor,
  MAX_ATTACHMENT_BYTES,
  readImageFiles,
  referencedNames,
} from './files';
import { slugName, uniqueName } from './names';
import { withoutReference } from './useInlineInsert';

describe('attachment names', () => {
  it('turns file names into lowercase, URL-safe names with the right extension', () => {
    expect(slugName('Screenshot 2026-11-12 at 17.18.24.png', 'image/png')).toBe(
      'screenshot-2026-11-12-at-17.18.24.png',
    );
    expect(slugName('Café (final)!.JPEG', 'image/jpeg')).toBe('cafe-final.jpg');
    expect(slugName('', 'image/webp')).toBe('image.webp');
    expect(slugName('...', 'image/png')).toBe('image.png');
    expect(slugName('logo.gif', 'image/png')).toBe('logo.png');
  });

  it('numbers a name that is already taken', () => {
    const taken = new Set(['image.png', 'image-2.png']);
    expect(uniqueName('image.png', taken)).toBe('image-3.png');
    expect(uniqueName('image.png', taken)).toBe('image-4.png');
    expect(uniqueName('other.png', taken)).toBe('other.png');
  });
});

describe('attachment helpers', () => {
  it('writes YouTrack-style references and finds them, old form included', () => {
    const md = `intro\n\n${attachmentMarkdown('a-1.png')}\n\n![x](b.png "title")`;
    expect(md).toContain('![](a-1.png)');
    expect([...referencedNames(md, 'and ![](attachment:c.jpg) ![](<d.gif>)')]).toEqual([
      'a-1.png',
      'b.png',
      'c.jpg',
      'd.gif',
    ]);
  });

  it('ignores links, URLs and paths that cannot be attachment names', () => {
    const md = '[a.png](a.png) ![](https://x.io/b.png) ![](dir/c.png) ![](Upper.png)';
    expect([...referencedNames(md)]).toEqual([]);
    expect(attachmentNameOf('attachment:x.png')).toBe('x.png');
    expect(attachmentNameOf('data:image/png;base64,AA')).toBeNull();
  });

  it('takes only the reference back out, leaving the whitespace around it', () => {
    expect(withoutReference(`a\n\n${attachmentMarkdown('x.png')}\n\n  b`, 'x.png')).toBe(
      'a\n\n\n\n  b',
    );
  });

  it('inserts exactly at the caret without touching the text around it', () => {
    const el = document.createElement('textarea');
    el.value = 'before  \n\n\nafter';
    el.setSelectionRange(8, 8);
    const r = insertAtCursor(el, el.value, 'IMG');
    expect(r.value).toBe('before  IMG\n\n\nafter');
    expect(r.value.slice(0, r.caret)).toBe('before  IMG');
  });

  it('replaces a selection', () => {
    const el = document.createElement('textarea');
    el.value = 'a XX b';
    el.setSelectionRange(2, 4);
    expect(insertAtCursor(el, el.value, 'IMG').value).toBe('a IMG b');
  });

  it('appends as is when there is no textarea', () => {
    expect(insertAtCursor(null, 'text\n\n', 'IMG').value).toBe('text\n\nIMG');
    expect(insertAtCursor(null, '', 'IMG').value).toBe('IMG');
  });

  it('accepts supported images under free names and turns away the rest', async () => {
    const ok = new File([new Uint8Array([1, 2])], 'My Shot.png', { type: 'image/png' });
    const again = new File([new Uint8Array([3])], 'my shot.png', { type: 'image/png' });
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    const big = new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    const { accepted, rejected } = await readImageFiles(
      [ok, again, svg, big],
      new Set(['my-shot.png']),
    );
    expect(accepted.map((a) => [a.name, a.mime, a.data.byteLength])).toEqual([
      ['my-shot-2.png', 'image/png', 2],
      ['my-shot-3.png', 'image/png', 1],
    ]);
    expect(rejected).toEqual([
      { name: 'logo.svg', reason: 'type' },
      { name: 'big.jpg', reason: 'size' },
    ]);
  });
});
