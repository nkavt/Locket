import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { COLOR_SCHEMA, ICON_SCHEMA } from './schemas';

describe('MCP input schemas', () => {
  it('accepts only icon names the font knows, explaining the rest', () => {
    expect(ICON_SCHEMA.safeParse('storefront').success).toBe(true);
    const bad = ICON_SCHEMA.safeParse('shop_icon');
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].message).toMatch(/Unknown icon "shop_icon".*e\.g\. storefront/);
  });

  it('keeps the icon list out of the JSON schema agents see', () => {
    const json = z.toJSONSchema(ICON_SCHEMA);
    expect(json).toMatchObject({ type: 'string' });
    expect(json).not.toHaveProperty('enum');
    expect(JSON.stringify(json).length).toBeLessThan(500);
  });

  it('accepts only #rrggbb colours', () => {
    expect(COLOR_SCHEMA.safeParse('#229ED9').success).toBe(true);
    expect(COLOR_SCHEMA.safeParse('blue').success).toBe(false);
  });
});
