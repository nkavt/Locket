import { useCallback, useState } from 'react';

const read = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};

/**
 * A boolean UI preference kept in the renderer's localStorage (like the theme), so it
 * survives restarts. Storage errors fall back to `fallback` and keep the value in memory.
 */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(() => read(key, fallback));
  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // storage unavailable: keep it for this session only
      }
    },
    [key],
  );
  return [value, set];
}
