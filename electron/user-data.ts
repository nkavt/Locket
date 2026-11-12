import * as path from 'node:path';

export interface UserDataDirOptions {
  /** Value of `LOCKET_USER_DATA_DIR`, if set. Relative paths resolve against `cwd`. */
  envDir?: string;
  isPackaged: boolean;
  /** The project root when running unpackaged (`app.getAppPath()`). */
  appPath: string;
  cwd: string;
}

/**
 * Where Electron's userData (database, settings, logs, browser storage) should live, or `null`
 * to keep the OS default. Unpackaged runs default to `<project>/temp/.config` so development
 * never touches the installed app's data.
 */
export const resolveUserDataDir = ({
  envDir,
  isPackaged,
  appPath,
  cwd,
}: UserDataDirOptions): string | null => {
  if (envDir?.trim()) return path.resolve(cwd, envDir.trim());
  if (isPackaged) return null;
  return path.join(appPath, 'temp', '.config');
};
