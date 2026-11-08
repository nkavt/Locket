import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl, isDevServerUrl } from './navigation';

describe('isAllowedExternalUrl', () => {
  it.each(['https://example.com/a?b=c', 'http://example.com', 'mailto:me@example.com'])(
    'allows %s',
    (url) => {
      expect(isAllowedExternalUrl(url)).toBe(true);
    },
  );

  it.each([
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'smb://host/share',
    'ms-settings:',
    'vbscript:msgbox',
    'not a url',
    '',
  ])('blocks %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it('matches protocols case-insensitively', () => {
    expect(isAllowedExternalUrl('HTTPS://example.com')).toBe(true);
  });
});

describe('isDevServerUrl', () => {
  const dev = 'http://localhost:5173';

  it('allows navigation within the dev server', () => {
    expect(isDevServerUrl('http://localhost:5173/#/settings', dev)).toBe(true);
  });

  it('rejects other origins', () => {
    expect(isDevServerUrl('http://localhost:5174/', dev)).toBe(false);
    expect(isDevServerUrl('https://example.com/', dev)).toBe(false);
  });

  it('rejects everything when there is no dev server', () => {
    expect(isDevServerUrl('http://localhost:5173/', undefined)).toBe(false);
  });
});
