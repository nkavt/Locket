// Tray and menu icons, drawn in code so no extra image assets need bundling.
// Bitmaps are premultiplied BGRA, the layout `nativeImage.createFromBitmap` expects.

export interface Bitmap {
  width: number;
  height: number;
  buffer: Buffer;
}

type Point = readonly [number, number];

// The Locket glyph from build/icon.svg, in the tile's 512-unit space.
const GLYPH: readonly Point[] = [
  [180, 128],
  [180, 346],
  [242, 390],
  [366, 272],
];
const GLYPH_HALF_STROKE = 29;
const GLYPH_BOUNDS = { x: 151, y: 99, w: 244, h: 320 };

const SUPERSAMPLE = 4;

const distToSegment = ([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** Render a shape given as an "is this point inside" test, with supersampled anti-aliasing. */
const rasterize = (
  size: number,
  inside: (x: number, y: number) => boolean,
  [r, g, b, a]: readonly [number, number, number, number],
): Bitmap => {
  const buffer = Buffer.alloc(size * size * 4);
  const samples = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          if (inside(x + (sx + 0.5) / SUPERSAMPLE, y + (sy + 0.5) / SUPERSAMPLE)) hits++;
        }
      }
      const alpha = (hits / samples) * a;
      const i = (y * size + x) * 4;
      buffer[i] = Math.round(b * alpha);
      buffer[i + 1] = Math.round(g * alpha);
      buffer[i + 2] = Math.round(r * alpha);
      buffer[i + 3] = Math.round(255 * alpha);
    }
  }
  return { width: size, height: size, buffer };
};

/**
 * The menu bar glyph as a black template image (macOS tints it for light and dark bars).
 * Stopped draws it faded, so the server state shows at a glance.
 */
export const trayGlyph = (size: number, running: boolean): Bitmap => {
  const pad = size / 16;
  const scale = (size - 2 * pad) / GLYPH_BOUNDS.h;
  const offX = (size - GLYPH_BOUNDS.w * scale) / 2 - GLYPH_BOUNDS.x * scale;
  const offY = pad - GLYPH_BOUNDS.y * scale;
  const inside = (x: number, y: number): boolean => {
    const p: Point = [(x - offX) / scale, (y - offY) / scale];
    for (let i = 1; i < GLYPH.length; i++) {
      if (distToSegment(p, GLYPH[i - 1], GLYPH[i]) <= GLYPH_HALF_STROKE) return true;
    }
    return false;
  };
  return rasterize(size, inside, [0, 0, 0, running ? 1 : 0.4]);
};

export const RUNNING_COLOR = [0x34, 0xc7, 0x59] as const; // macOS system green
export const STOPPED_COLOR = [0x8e, 0x8e, 0x93] as const; // macOS system gray

/** A filled status dot, used as the badge on the Start/Stop menu item. */
export const statusDot = (size: number, running: boolean): Bitmap => {
  const c = size / 2;
  const radius = size * 0.32;
  const [r, g, b] = running ? RUNNING_COLOR : STOPPED_COLOR;
  return rasterize(size, (x, y) => Math.hypot(x - c, y - c) <= radius, [r, g, b, 1]);
};
