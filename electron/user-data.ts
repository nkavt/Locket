import * as path from 'node:path';

export interface UserDataDirOptions {
  /**
   * Value of `LOCKET_USER_DATA_DIR`, if set. Relative paths resolve against `cwd`. Only used
   * when unpackaged.
   */
  envDir?: string;
  isPackaged: boolean;
  /** The project root when running unpackaged (`app.getAppPath()`). */
  appPath: string;
  cwd: string;
}

/**
 * Where Electron's userData (database, settings, logs, browser storage) should live, or `null`
 * to keep the OS default. Unpackaged runs default to `<project>/temp/.config` so development
 * never touches the installed app's data; `LOCKET_USER_DATA_DIR` overrides that location.
 */
export const resolveUserDataDir = ({
  envDir,
  isPackaged,
  appPath,
  cwd,
}: UserDataDirOptions): string | null => {
  // Packaged builds ignore the env var on purpose. On Windows (user/system env vars) and Linux
  // (vars exported in ~/.profile) a globally set variable reaches desktop-launched apps, and it
  // would silently point the installed app at an empty data folder.
  if (isPackaged) return null;
  if (envDir?.trim()) return path.resolve(cwd, envDir.trim());
  return path.join(appPath, 'temp', '.config');
};
