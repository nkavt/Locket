import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { attachmentMarkdown, mimeOfName, slugName, uniqueName } from '../attachments/rules';
import type { NewAttachment } from '../db/types';
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES, ValidationError } from '../services';

export const IMAGE = z
  .object({
    path: z
      .string()
      .optional()
      .describe(
        'Absolute path of an image file on this computer (PNG, JPEG, GIF, WebP, AVIF, BMP)',
      ),
    data: z.string().optional().describe('Base64 image bytes, when there is no file to point at'),
    mime: z
      .string()
      .optional()
      .describe('Image type for `data`, e.g. "image/png". For a path it comes from the extension'),
    name: z
      .string()
      .optional()
      .describe(
        'Name to show it by, e.g. "login-screen.png". Defaults to the file name. Stored lowercase ' +
          'and URL-safe, numbered ("-2") if the ticket already has it',
      ),
  })
  .describe('One image: give either `path` or `data`');

export const IMAGES = z
  .array(IMAGE)
  .max(20)
  .optional()
  .describe(
    'Images to attach. To show one inline, write ![](<name>) in the markdown with the same name; ' +
      'if a name has to change, references in this call are updated to match. Images not ' +
      'referenced still appear as thumbnails.',
  );

export type ImageInput = z.infer<typeof IMAGE>;

/** File signatures, so only real images get stored whatever their name says. */
const looksLike = (mime: string, b: Uint8Array): boolean => {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  switch (mime) {
    case 'image/png':
      return b[0] === 0x89 && ascii(1, 4) === 'PNG';
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8;
    case 'image/gif':
      return ascii(0, 4) === 'GIF8';
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'image/avif':
      return ascii(4, 8) === 'ftyp';
    case 'image/bmp':
      return ascii(0, 2) === 'BM';
    default:
      return false;
  }
};

const readFromPath = async (file: string): Promise<{ mime: string; data: Uint8Array }> => {
  if (!path.isAbsolute(file)) throw new ValidationError(`Image path must be absolute: "${file}"`);
  const mime = mimeOfName(file);
  if (!mime) throw new ValidationError(`"${file}" is not a supported image type`);
  const st = await fs.stat(file).catch(() => null);
  if (!st?.isFile()) throw new ValidationError(`No image file at "${file}"`);
  if (st.size > MAX_ATTACHMENT_BYTES) {
    throw new ValidationError(`"${file}" is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB`);
  }
  return { mime, data: new Uint8Array(await fs.readFile(file)) };
};

/**
 * Turn tool inputs into attachments with free names. `taken` holds the ticket's names and
 * is updated. Returns the attachments and, for every name the caller used that had to
 * change, the name it got instead.
 */
export async function loadImages(
  inputs: ImageInput[] | undefined,
  taken: Set<string>,
): Promise<{ files: NewAttachment[]; renamed: Array<[string, string]> }> {
  const files: NewAttachment[] = [];
  const renamed: Array<[string, string]> = [];
  for (const input of inputs ?? []) {
    if (!input.path === !input.data) {
      throw new ValidationError('Each image needs exactly one of `path` or `data`');
    }
    let mime: string;
    let data: Uint8Array;
    if (input.path) {
      ({ mime, data } = await readFromPath(input.path));
    } else {
      mime = input.mime ?? '';
      if (!ATTACHMENT_MIME_TYPES.includes(mime)) {
        throw new ValidationError(`Unsupported image type "${mime}" (give \`mime\` with \`data\`)`);
      }
      data = new Uint8Array(Buffer.from(input.data!, 'base64'));
    }
    if (!looksLike(mime, data)) {
      throw new ValidationError(
        `${input.path ? `"${input.path}"` : 'Image data'} is not a valid ${mime} image`,
      );
    }
    const asked = input.name ?? (input.path ? path.basename(input.path) : 'image');
    const name = uniqueName(slugName(asked, mime), taken);
    if (asked !== name) renamed.push([asked, name]);
    files.push({ name, mime, data });
  }
  return { files, renamed };
}

/** Point `![…](asked)` references at the names the images actually got. */
export const applyRenames = (markdown: string, renamed: Array<[string, string]>): string =>
  renamed.reduce(
    (md, [asked, name]) =>
      md.split(`](${asked})`).join(`](${name})`).split(`](attachment:${asked})`).join(`](${name})`),
    markdown,
  );

export const imageSummary = (files: Array<{ name: string }>) =>
  files.map((f) => ({ name: f.name, markdown: attachmentMarkdown(f.name) }));
