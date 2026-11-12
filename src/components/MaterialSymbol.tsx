import { Box, type BoxProps } from '@mui/material';

interface MaterialSymbolProps {
  /** Any Material Symbols name, e.g. "storefront". The bundled font draws it as a ligature. */
  name: string;
  size?: number;
  sx?: BoxProps['sx'];
}

/**
 * One icon from the bundled Material Symbols font (filled, to match the app's other icons).
 * Used for project icons, where any of the font's ~4,000 names may appear; the app's own UI
 * icons stay on the SVG set in `Icon`.
 */
export function MaterialSymbol({ name, size = 20, sx }: MaterialSymbolProps) {
  return (
    <Box
      component="span"
      className="material-symbols-outlined"
      aria-hidden
      sx={{
        fontSize: size,
        width: size,
        height: size,
        overflow: 'hidden',
        userSelect: 'none',
        fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...sx,
      }}
    >
      {name}
    </Box>
  );
}
