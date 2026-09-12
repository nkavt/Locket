import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const fontFamily = '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const monoFamily = '"JetBrains Mono", ui-monospace, monospace';

export function getTheme(mode: ThemeMode): Theme {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#90caf9' : '#1976d2',
        dark: isDark ? '#64b5f6' : '#1565c0',
      },
      error: { main: isDark ? '#f44336' : '#d32f2f' },
      warning: { main: isDark ? '#ffa726' : '#ed6c02' },
      success: { main: isDark ? '#66bb6a' : '#2e7d32' },
      info: { main: isDark ? '#29b6f6' : '#0288d1' },
      background: {
        default: isDark ? '#0f1115' : '#fafafa',
        paper: isDark ? '#15181f' : '#ffffff',
      },
      text: {
        primary: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.87)',
        secondary: isDark ? 'rgba(255,255,255,0.66)' : 'rgba(0,0,0,0.6)',
        disabled: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.38)',
      },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily,
      fontSize: 14,
      button: { textTransform: 'uppercase', fontWeight: 500 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'html, body, #root': { height: '100%', margin: 0, padding: 0 },
          body: { overflow: 'hidden' },
          'code, pre, .mono': { fontFamily: monoFamily },
          '::-webkit-scrollbar': { width: 10, height: 10 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            borderRadius: 6,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '::-webkit-scrollbar-thumb:hover': {
            background: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)',
            backgroundClip: 'content-box',
            border: '2px solid transparent',
          },
          '@keyframes pulseDot': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(46,125,50,0.5)' },
            '50%': { boxShadow: '0 0 0 6px rgba(46,125,50,0)' },
          },
          '@keyframes slideIn': {
            from: { opacity: 0, transform: 'translateX(-8px)' },
            to: { opacity: 1, transform: 'translateX(0)' },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 4 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: 11 },
        },
      },
    },
  });
}

export const monoFontFamily = monoFamily;
