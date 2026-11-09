import { describe, expect, it } from 'vitest';
import { RUNNING_COLOR, statusDot, STOPPED_COLOR, trayGlyph } from './icons';

const pixel = (buf: Buffer, size: number, x: number, y: number) => {
  const i = (y * size + x) * 4;
  return { b: buf[i], g: buf[i + 1], r: buf[i + 2], a: buf[i + 3] };
};

const alphas = (buf: Buffer) => [...buf].filter((_, i) => i % 4 === 3);

describe('trayGlyph', () => {
  it('draws a black glyph with transparent corners', () => {
    const { width, height, buffer } = trayGlyph(36, true);
    expect([width, height, buffer.length]).toEqual([36, 36, 36 * 36 * 4]);
    expect(pixel(buffer, 36, 0, 0).a).toBe(0);
    expect(Math.max(...alphas(buffer))).toBe(255);
    expect([...buffer].filter((_, i) => i % 4 !== 3).every((v) => v === 0)).toBe(true);
  });

  it('fades the glyph while stopped', () => {
    expect(Math.max(...alphas(trayGlyph(36, false).buffer))).toBe(102);
  });
});

describe('statusDot', () => {
  it.each([
    [true, RUNNING_COLOR],
    [false, STOPPED_COLOR],
  ])('running=%s fills the centre with its colour', (running, [r, g, b]) => {
    const { buffer } = statusDot(20, running);
    expect(pixel(buffer, 20, 10, 10)).toEqual({ r, g, b, a: 255 });
    expect(pixel(buffer, 20, 0, 0).a).toBe(0);
  });
});
