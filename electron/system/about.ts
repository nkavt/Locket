/**
 * What the Settings → About card shows. Read in the main process, where Node knows the real
 * OS and CPU architecture: Chromium freezes `navigator.platform` at "MacIntel" on every Mac
 * and the user agent at "Intel Mac OS X 10_15_7", so the renderer can't tell.
 *
 * Pure (no Node imports) so the renderer can format with the same code.
 */
export interface SystemInfo {
  /** `process.platform`: 'darwin' | 'win32' | 'linux' | … */
  platform: string;
  /** `process.arch`: 'arm64' | 'x64' | … */
  arch: string;
  /** macOS / Windows version, or the kernel release on Linux. */
  osVersion: string;
  electronVersion: string;
}

const OS_NAMES: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
};

/** "macOS 26.7 · arm64", "Windows 10.0.26100 · x64", "Linux 6.8.0 · x64". */
export function formatPlatform(info: Pick<SystemInfo, 'platform' | 'arch' | 'osVersion'>): string {
  const os = [OS_NAMES[info.platform] ?? info.platform, info.osVersion].filter(Boolean).join(' ');
  return [os, info.arch].filter(Boolean).join(' · ');
}

/** One line for bug reports: "Locket 0.2.1 · Electron 45.2.3 · macOS 26.7 arm64". */
export function formatAboutLine(appVersion: string, info: SystemInfo): string {
  return [
    `Locket ${appVersion}`,
    `Electron ${info.electronVersion}`,
    formatPlatform(info).replace(' · ', ' '),
  ].join(' · ');
}
