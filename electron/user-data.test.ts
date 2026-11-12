import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveUserDataDir } from './user-data';

const base = { appPath: '/repo', cwd: '/work' };

describe('resolveUserDataDir', () => {
  it('defaults to temp/.config in the project when unpackaged', () => {
    expect(resolveUserDataDir({ ...base, isPackaged: false })).toBe(
      path.join('/repo', 'temp', '.config'),
    );
  });

  it('keeps the OS default when packaged', () => {
    expect(resolveUserDataDir({ ...base, isPackaged: true })).toBeNull();
  });

  it('prefers the env var when unpackaged, resolving relative paths against cwd', () => {
    expect(resolveUserDataDir({ ...base, isPackaged: false, envDir: 'tmp/a' })).toBe(
      path.resolve('/work', 'tmp/a'),
    );
    expect(resolveUserDataDir({ ...base, isPackaged: false, envDir: '/abs/dir' })).toBe(
      path.resolve('/abs/dir'),
    );
  });

  it('ignores the env var when packaged, so a global variable cannot move real data', () => {
    expect(resolveUserDataDir({ ...base, isPackaged: true, envDir: '/abs/dir' })).toBeNull();
  });

  it('ignores a blank env var', () => {
    expect(resolveUserDataDir({ ...base, isPackaged: false, envDir: '  ' })).toBe(
      path.join('/repo', 'temp', '.config'),
    );
  });
});
