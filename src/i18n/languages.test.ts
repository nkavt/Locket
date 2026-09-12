import { describe, expect, it } from 'vitest';
import { FALLBACK_LANGUAGE, resolveLanguage } from './languages';

describe('resolveLanguage', () => {
  it('resolves a supported base language from a full tag', () => {
    expect(resolveLanguage('en-US')).toBe('en');
    expect(resolveLanguage('EN')).toBe('en');
  });
  it('falls back for unsupported or missing tags', () => {
    expect(resolveLanguage('xx-YY')).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage(undefined)).toBe(FALLBACK_LANGUAGE);
  });
});
