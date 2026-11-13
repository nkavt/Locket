import * as os from 'node:os';
import type { SystemInfo } from './about';

type ProcessLike = Pick<NodeJS.Process, 'platform' | 'arch' | 'versions'> & {
  /** Electron-only; missing when running as plain Node (tests). */
  getSystemVersion?: () => string;
};

/**
 * The real OS, version and architecture for Settings → About. On Linux Electron reports no
 * distro version, so show the kernel release instead.
 */
export function readSystemInfo(
  proc: ProcessLike = process,
  kernelRelease: () => string = os.release,
): SystemInfo {
  const osVersion =
    proc.platform === 'linux' || !proc.getSystemVersion ? kernelRelease() : proc.getSystemVersion();
  return {
    platform: proc.platform,
    arch: proc.arch,
    osVersion,
    versions: {
      electron: proc.versions.electron ?? '',
      node: proc.versions.node,
    },
  };
}
