import type { NewAttachment } from '@/types/electron-api';
// The same rules the main process enforces, so bad files are turned away before the round trip.
import {
  ATTACHMENT_MIME_TYPES,
  attachmentMarkdown,
  MAX_ATTACHMENT_BYTES,
  NAME_RE,
  slugName,
  uniqueName,
} from '../../../electron/attachments/rules';

export { ATTACHMENT_MIME_TYPES, attachmentMarkdown, MAX_ATTACHMENT_BYTES };
export const ATTACHMENT_ACCEPT = ATTACHMENT_MIME_TYPES.join(',');

/** An image picked in an editor but not saved yet, with a local preview. */
export interface PendingAttachment extends NewAttachment {
  previewUrl: string;
}

export interface RejectedFile {
  name: string;
  reason: 'type' | 'size';
}

const previewUrl = (data: Uint8Array, mime: string): string =>
  typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(new Blob([data as BlobPart], { type: mime }))
    : '';

export const releasePreview = (a: PendingAttachment): void => {
  if (a.previewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(a.previewUrl);
};

/**
 * Read picked, pasted or dropped files into attachments, turning away the ones we cannot
 * store. Each gets a tidy name not already in `taken` (which is updated).
 */
export async function readImageFiles(
  files: Iterable<File>,
  taken: Set<string> = new Set(),
): Promise<{ accepted: PendingAttachment[]; rejected: RejectedFile[] }> {
  const accepted: PendingAttachment[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    const name = file.name || 'pasted-image.png';
    if (!ATTACHMENT_MIME_TYPES.includes(file.type)) {
      rejected.push({ name, reason: 'type' });
      continue;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      rejected.push({ name, reason: 'size' });
      continue;
    }
    const data = new Uint8Array(await file.arrayBuffer());
    accepted.push({
      name: uniqueName(slugName(name, file.type), taken),
      mime: file.type,
      data,
      previewUrl: previewUrl(data, file.type),
    });
  }
  return { accepted, rejected };
}

/** Strip the preview so only what the backend stores crosses IPC. */
export const toNewAttachment = ({ name, mime, data }: PendingAttachment): NewAttachment => ({
  name,
  mime,
  data,
});

/** Older form of a reference, `![](attachment:name)`; still understood. */
export const ATTACHMENT_SCHEME = 'attachment:';

/**
 * The attachment name an image source points at, or null. Like YouTrack, a bare file
 * name (`login-screen.png`) means an image of the current ticket; `attachment:name`
 * from earlier builds still works.
 */
export const attachmentNameOf = (src: string): string | null => {
  const name = src.startsWith(ATTACHMENT_SCHEME) ? src.slice(ATTACHMENT_SCHEME.length) : src;
  return NAME_RE.test(name) ? name : null;
};

/** Names of the attachments some markdown shows inline. */
export const referencedNames = (...markdown: string[]): Set<string> =>
  new Set(
    markdown.flatMap((md) =>
      Array.from(md.matchAll(/!\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g), (m) =>
        attachmentNameOf(m[1]),
      ).filter((n): n is string => !!n),
    ),
  );

/**
 * Put `snippet` exactly where the caret is in `el` (or at the end when there is no
 * textarea), replacing any selection. Nothing else in the text is touched: blank lines
 * and spaces around it may be intentional.
 */
export function insertAtCursor(
  el: HTMLTextAreaElement | null,
  value: string,
  snippet: string,
): { value: string; caret: number } {
  const start = el ? el.selectionStart : value.length;
  const end = el ? el.selectionEnd : value.length;
  const before = value.slice(0, start);
  return { value: before + snippet + value.slice(end), caret: (before + snippet).length };
}

/** Files carried by a paste or a drop (text in the same transfer is left alone). */
export const filesFromTransfer = (dt: DataTransfer | null): File[] =>
  Array.from(dt?.items ?? [])
    .filter((it) => it.kind === 'file')
    .map((it) => it.getAsFile())
    .filter((f): f is File => !!f);
