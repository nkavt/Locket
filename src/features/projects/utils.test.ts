import { describe, expect, it } from 'vitest';
import { deriveSlug } from './utils';

describe('deriveSlug', () => {
  it('lowercases and replaces non-alphanumerics with dashes', () => {
    expect(deriveSlug('Mobile App')).toBe('mobile-app');
    expect(deriveSlug('Hello, World!')).toBe('hello-world');
  });
  it('trims leading and trailing dashes', () => {
    expect(deriveSlug('  --Docs--  ')).toBe('docs');
  });
  it('caps at 12 characters', () => {
    expect(deriveSlug('a very long project name')).toBe('a-very-long-');
  });
});
