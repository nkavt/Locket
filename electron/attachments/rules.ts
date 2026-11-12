/*
 * What an attachment may be and how it is named. Shared by the main process and the
 * renderer (which checks before the round trip), so it must stay free of Node and DOM APIs.
 */

/**
 * The image formats we store, each with its file extensions; new files get the first one.
 * Raster only: they render in an <img> without any way to reach out to the network.
 */
const IMAGE_TYPES: Record<string, readonly string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/bmp': ['.bmp'],
};

export const ATTACHMENT_MIME_TYPES = Object.keys(IMAGE_TYPES);

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_TYPES).flatMap(([mime, exts]) => exts.map((ext) => [ext, mime])),
);

/** The image type a file name's extension stands for, if we store it. */
export const mimeOfName = (name: string): string | undefined => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? MIME_BY_EXT[name.slice(dot).toLowerCase()] : undefined;
};

/** Markdown that shows an attachment inline, YouTrack style: `![](login-screen.png)`. */
export const attachmentMarkdown = (name: string): string => `![](${name})`;

/** Lowercase letters, digits, ".", "_" and "-", starting with a letter or digit. */
export const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/;

/** A storable name whose extension matches the image type. */
export const isValidName = (name: unknown, mime: string): name is string =>
  typeof name === 'string' && NAME_RE.test(name) && mimeOfName(name) === mime;

const MAX_BASE = 80;

/** "Screenshot 2026-11-12 at 17.18.png" → "screenshot-2026-11-12-at-17.18.png". */
export function slugName(raw: string, mime: string): string {
  const ext = IMAGE_TYPES[mime]?.[0] ?? '.png';
  const dot = raw.lastIndexOf('.');
  const stem = dot > 0 ? raw.slice(0, dot) : raw;
  const base =
    stem
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, MAX_BASE)
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '') || 'image';
  return base + ext;
}

/** `name`, or `name-2`, `name-3`… whichever is free. Adds the result to `taken`. */
export function uniqueName(name: string, taken: Set<string>): string {
  const dot = name.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  let out = name;
  for (let n = 2; taken.has(out); n++) out = `${base}-${n}${ext}`;
  taken.add(out);
  return out;
}
