import { describe, expect, it } from 'vitest';
import { formatAboutLine, formatPlatform, type SystemInfo } from './about';

const versions = { electron: '45.2.3', node: '22.20.0' };

describe('formatPlatform', () => {
  it.each([
    [{ platform: 'darwin', arch: 'arm64', osVersion: '26.7' }, 'macOS 26.7 · arm64'],
    [{ platform: 'darwin', arch: 'x64', osVersion: '15.6.1' }, 'macOS 15.6.1 · x64'],
    [{ platform: 'win32', arch: 'x64', osVersion: '10.0.26100' }, 'Windows 10.0.26100 · x64'],
    [
      { platform: 'linux', arch: 'arm64', osVersion: '6.8.0-49-generic' },
      'Linux 6.8.0-49-generic · arm64',
    ],
  ])('%o → %s', (info, expected) => {
    expect(formatPlatform(info)).toBe(expected);
  });

  it('falls back to the raw platform name and skips missing parts', () => {
    expect(formatPlatform({ platform: 'freebsd', arch: 'x64', osVersion: '' })).toBe(
      'freebsd · x64',
    );
  });
});

describe('formatAboutLine', () => {
  it('puts everything a bug report needs on one line', () => {
    const info: SystemInfo = { platform: 'darwin', arch: 'arm64', osVersion: '26.7', versions };
    expect(formatAboutLine('0.2.1', info)).toBe(
      'Locket 0.2.1 · Electron 45.2.3 · Node 22.20.0 · macOS 26.7 arm64',
    );
  });
});
