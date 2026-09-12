import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { avatarColor, formatDate, initials, labelColor, relativeTime } from './format';

describe('relativeTime', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-06-01T12:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('returns "just now" under a minute', () => {
    expect(relativeTime('2026-06-01T11:59:30Z')).toBe('just now');
  });

  it('formats minutes, hours and days in the past', () => {
    expect(relativeTime('2026-06-01T11:55:00Z')).toBe('5m ago');
    expect(relativeTime('2026-06-01T09:00:00Z')).toBe('3h ago');
    expect(relativeTime('2026-05-30T12:00:00Z')).toBe('2d ago');
  });

  it('falls back to a date after a week', () => {
    expect(relativeTime('2026-05-01T12:00:00Z')).toMatch(/2026/);
  });

  it('returns empty for missing input', () => {
    expect(relativeTime(null)).toBe('');
    expect(relativeTime(undefined)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats as short month and day', () => {
    expect(formatDate('2026-05-12')).toBe('May 12');
  });
  it('returns empty for missing input', () => {
    expect(formatDate(null)).toBe('');
  });
});

describe('labelColor', () => {
  it('returns the palette colour for known labels', () => {
    expect(labelColor('bug')).toBe('#d32f2f');
  });
  it('returns a fallback for unknown labels', () => {
    expect(labelColor('nope')).toBe('#607d8b');
  });
});

describe('initials', () => {
  it('takes the first letter of up to two words', () => {
    expect(initials('Ari Chen')).toBe('AC');
    expect(initials('Sam')).toBe('S');
    expect(initials('  Jules   Park Smith ')).toBe('JP');
  });
});

describe('avatarColor', () => {
  it('is deterministic and an oklch string', () => {
    expect(avatarColor('Ari')).toBe(avatarColor('Ari'));
    expect(avatarColor('Ari')).toMatch(/^oklch\(/);
  });
});
