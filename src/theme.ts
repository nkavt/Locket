import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const fontFamily = '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const monoFamily = '"JetBrains Mono", ui-monospace, monospace';

/**
 * Dark surfaces, lowest to highest: the page, panels and cards (sidebar, headers,
 * settings cards), then floating layers (dialogs, menus, popovers).
 */
/** Page background per mode. index.html repeats these so the first frame matches the theme. */
export const PAGE_BACKGROUND = { light: '#fafafa', dark: '#0e1014' } as const satisfies Record<
  ThemeMode,
  string
>;

/** Max width of a page's content column (ticket page, settings), centred on wide windows. */
export const PAGE_MAX_WIDTH = 920;

/** Colours for highlighted code (highlight.js `hljs-*` classes), drawn on `action.hover`. */
export interface SyntaxPalette {
  keyword: string;
  string: string;
  number: string;
  title: string;
  attr: string;
  tag: string;
  comment: string;
  addition: { bg: string; fg: string };
  deletion: { bg: string; fg: string };
}

declare module '@mui/material/styles' {
  interface Palette {
    syntax: SyntaxPalette;
  }
  interface PaletteOptions {
    syntax?: SyntaxPalette;
  }
}

/** Based on GitHub's light and dark code colours, nudged to keep 4.5:1 on Locket's code background. */
const SYNTAX: Record<ThemeMode, SyntaxPalette> = {
  light: {
    keyword: '#cf222e',
    string: '#0a3069',
    number: '#0550ae',
    title: '#6f42c1',
    attr: '#953800',
    tag: '#116329',
    comment: '#59636e',
    addition: { bg: '#dafbe1', fg: '#116329' },
    deletion: { bg: '#ffebe9', fg: '#82071e' },
  },
  dark: {
    keyword: '#ff7b72',
    string: '#a5d6ff',
    number: '#79c0ff',
    title: '#d2a8ff',
    attr: '#ffa657',
    tag: '#7ee787',
    comment: '#8b949e',
    addition: { bg: 'rgba(46,160,67,0.15)', fg: '#aff5b4' },
    deletion: { bg: 'rgba(248,81,73,0.15)', fg: '#ffdcd7' },
  },
};

const darkSurface = {
  page: PAGE_BACKGROUND.dark,
  paper: '#171a21',
  elevated: '#1f232c',
  border: 'rgba(255,255,255,0.13)',
};

export function getTheme(mode: ThemeMode): Theme {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#90caf9' : '#1976d2',
        dark: isDark ? '#64b5f6' : '#1565c0',
      },
      // Dark mode uses a softer red (MUI red 300) so destructive actions don't glare.
      error: isDark ? { main: '#e57373', dark: '#d65c5c' } : { main: '#d32f2f' },
      warning: { main: isDark ? '#ffa726' : '#ed6c02' },
      success: { main: isDark ? '#66bb6a' : '#2e7d32' },
      info: { main: isDark ? '#29b6f6' : '#0288d1' },
      background: {
        default: PAGE_BACKGROUND[mode],
        paper: isDark ? darkSurface.paper : '#ffffff',
      },
      text: {
        primary: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.87)',
        secondary: isDark ? 'rgba(255,255,255,0.66)' : 'rgba(0,0,0,0.6)',
        disabled: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.38)',
      },
      divider: isDark ? darkSurface.border : 'rgba(0,0,0,0.08)',
      syntax: SYNTAX[mode],
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
          // Native controls (date picker, checkboxes, scrollbars) follow the theme.
          html: { colorScheme: mode },
          'html, body, #root': { height: '100%', margin: 0, padding: 0 },
          body: { overflow: 'hidden' },
          'code, pre, .mono': { fontFamily: monoFamily },
          '::-webkit-scrollbar': { width: 10, height: 10 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
            borderRadius: 6,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '::-webkit-scrollbar-thumb:hover': {
            background: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.16)',
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
      // Floating layers sit one step above paper, with a border instead of MUI's grey overlay.
      ...(isDark && {
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundColor: darkSurface.elevated,
              backgroundImage: 'none',
              border: `1px solid ${darkSurface.border}`,
            },
          },
        },
        MuiPopover: {
          styleOverrides: {
            paper: {
              backgroundColor: darkSurface.elevated,
              backgroundImage: 'none',
              border: `1px solid ${darkSurface.border}`,
            },
          },
        },
      }),
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: 11 },
        },
      },
    },
  });
}

export const monoFontFamily = monoFamily;
