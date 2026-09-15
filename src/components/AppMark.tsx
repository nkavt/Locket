import { Box, type SxProps, type Theme } from '@mui/material';

interface AppMarkProps {
  size?: number;
  sx?: SxProps<Theme>;
}

/** The Locket app icon as inline SVG (same artwork as build/icon.svg). */
export function AppMark({ size = 28, sx }: AppMarkProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden="true"
      sx={{ display: 'block', flexShrink: 0, ...sx }}
    >
      <rect width="512" height="512" rx="115" fill="#24224a" />
      <path d="M180 128v218" fill="none" stroke="#f6f4ff" strokeWidth="58" strokeLinecap="round" />
      <path
        d="M180 346l62 44 124-118"
        fill="none"
        stroke="#8b7cff"
        strokeWidth="58"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}
