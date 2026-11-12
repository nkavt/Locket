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
