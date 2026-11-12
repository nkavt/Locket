import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isMaterialSymbol, unknownIconMessage } from './icons';
import { MATERIAL_SYMBOLS_VERSION } from './material-symbols';

describe('project icon rules', () => {
  it('matches the installed font, so a version bump means regenerating the names', () => {
    const pkg = JSON.parse(
      readFileSync(
        new URL('../../node_modules/material-symbols/package.json', import.meta.url),
        'utf8',
      ),
    ) as { version: string };
    expect(MATERIAL_SYMBOLS_VERSION, 'run `npm run icons:names`').toBe(pkg.version);
  });

  it('knows every Material Symbols name, including the ones agents already used', () => {
    for (const name of [
      'storefront',
      'work',
      'shopping_bag',
      'support_agent',
      'lock',
      'terminal',
    ]) {
      expect(isMaterialSymbol(name)).toBe(true);
    }
    expect(isMaterialSymbol('not_an_icon')).toBe(false);
    expect(isMaterialSymbol('')).toBe(false);
    expect(isMaterialSymbol(undefined)).toBe(false);
  });

  it('explains unknown icons with examples', () => {
    expect(unknownIconMessage('nope')).toMatch(/Unknown icon "nope".*storefront, work/);
  });
});
