import { decomposeColor, getContrastRatio, recomposeColor } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import { getTheme, PAGE_BACKGROUND } from './theme';

describe('startup background', () => {
  it('index.html paints the same page colours as the theme', () => {
    for (const mode of ['light', 'dark'] as const) {
      expect(getTheme(mode).palette.background.default).toBe(PAGE_BACKGROUND[mode]);
      expect(indexHtml).toContain(`background-color: ${PAGE_BACKGROUND[mode]};`);
    }
  });
});

/** Paint a possibly translucent colour over an opaque one. */
function over(top: string, base: string): string {
  const t = decomposeColor(top);
  const b = decomposeColor(base);
  const a = t.type === 'rgba' || t.type === 'hsla' ? Number(t.values[3] ?? 1) : 1;
  const mix = [0, 1, 2].map((i) => Math.round(t.values[i] * a + b.values[i] * (1 - a)));
  return recomposeColor({ type: 'rgb', values: mix as [number, number, number] });
}

describe('syntax palette', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`every ${mode} token colour meets 4.5:1 on the code background`, () => {
      const { palette } = getTheme(mode);
      const { addition, deletion, ...tokens } = palette.syntax;
      // Code blocks sit on cards (paper) and on the page itself.
      for (const surface of [palette.background.paper, palette.background.default]) {
        const code = over(palette.action.hover, surface);
        const pairs: [string, string, string][] = [
          ...Object.entries(tokens).map(([k, c]): [string, string, string] => [k, c, code]),
          ['addition', addition.fg, over(addition.bg, code)],
          ['deletion', deletion.fg, over(deletion.bg, code)],
          ['text', palette.text.primary, code],
        ];
        for (const [name, fg, bg] of pairs) {
          const ratio = getContrastRatio(over(fg, bg), bg);
          expect(ratio, `${mode} ${name} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});
