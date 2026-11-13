import { describe, expect, it } from 'vitest';
import { readSystemInfo } from './info';

const versions = { electron: '45.2.3', node: '22.20.0' } as NodeJS.ProcessVersions;
const kernel = () => '6.8.0';

describe('readSystemInfo', () => {
  it('uses the real macOS version and architecture, not the frozen MacIntel', () => {
    const proc = {
      platform: 'darwin',
      arch: 'arm64',
      versions,
      getSystemVersion: () => '26.7',
    } as const;
    expect(readSystemInfo(proc, kernel)).toEqual({
      platform: 'darwin',
      arch: 'arm64',
      osVersion: '26.7',
      electronVersion: '45.2.3',
    });
  });

  it('uses the Windows build number', () => {
    const proc = {
      platform: 'win32',
      arch: 'x64',
      versions,
      getSystemVersion: () => '10.0.26100',
    } as const;
    expect(readSystemInfo(proc, kernel).osVersion).toBe('10.0.26100');
  });

  it('shows the kernel release on Linux', () => {
    const proc = {
      platform: 'linux',
      arch: 'x64',
      versions,
      getSystemVersion: () => 'ignored',
    } as const;
    expect(readSystemInfo(proc, kernel).osVersion).toBe('6.8.0');
  });

  it('works outside Electron, where getSystemVersion does not exist', () => {
    const proc = {
      platform: 'darwin',
      arch: 'x64',
      versions: { node: '22.20.0' } as NodeJS.ProcessVersions,
    } as const;
    expect(readSystemInfo(proc, kernel)).toMatchObject({ osVersion: '6.8.0', electronVersion: '' });
  });
});
