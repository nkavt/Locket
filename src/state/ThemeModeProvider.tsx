import { CssBaseline, ThemeProvider } from '@mui/material';
import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { getTheme, type ThemeMode } from '@/theme';
import { ThemeModeContext, type ThemeModeApi } from './ThemeModeContext';

/** The user's explicit choice. Absent means "follow the system". */
const THEME_KEY = 'locket-theme-v2';
/** v1 stored the mode on every launch, so only a stored 'dark' was a real choice. */
const LEGACY_THEME_KEY = 'locket-theme-v1';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readOverride(): ThemeMode | null {
  try {
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy !== null) {
      localStorage.removeItem(LEGACY_THEME_KEY);
      if (legacy === 'dark' && localStorage.getItem(THEME_KEY) === null) {
        localStorage.setItem(THEME_KEY, 'dark');
      }
    }
    const v = localStorage.getItem(THEME_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
}

function writeOverride(mode: ThemeMode | null) {
  try {
    if (mode) localStorage.setItem(THEME_KEY, mode);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // ignore
  }
}

const mediaQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : null;

function subscribeSystem(onChange: () => void) {
  const mq = mediaQuery();
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}

const getSystemMode = (): ThemeMode => (mediaQuery()?.matches ? 'dark' : 'light');

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemMode = useSyncExternalStore(subscribeSystem, getSystemMode, () => 'light' as const);
  const [override, setOverride] = useState<ThemeMode | null>(readOverride);
  const mode = override ?? systemMode;

  // Toggling back to the system's mode drops the override, so the app follows the system again.
  const toggle = useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    const nextOverride = next === systemMode ? null : next;
    writeOverride(nextOverride);
    setOverride(nextOverride);
  }, [mode, systemMode]);

  const api = useMemo<ThemeModeApi>(() => ({ mode, toggle }), [mode, toggle]);
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={api}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
