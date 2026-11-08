import { alpha, lighten, type Theme } from '@mui/material/styles';

/**
 * Text/icon colour for a user-picked colour (project, label). The palette is tuned for
 * light backgrounds, so dark mode lifts it until it reads on dark surfaces.
 */
export const tintText = (theme: Theme, color: string): string =>
  theme.palette.mode === 'dark' ? lighten(color, 0.45) : color;

/** Soft background behind `tintText`. Light mode keeps the original 13% wash. */
export const tintBg = (theme: Theme, color: string): string =>
  theme.palette.mode === 'dark' ? alpha(lighten(color, 0.2), 0.2) : color + '22';

/** Border for a selected tinted control. */
export const tintBorder = (theme: Theme, color: string): string =>
  theme.palette.mode === 'dark' ? alpha(lighten(color, 0.45), 0.5) : color + '55';
