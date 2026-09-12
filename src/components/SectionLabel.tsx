import { Typography, type TypographyProps } from '@mui/material';

/** Small uppercase heading used above groups, cards and sections. */
export function SectionLabel({ sx, ...rest }: TypographyProps) {
  return (
    <Typography
      {...rest}
      sx={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        ...sx,
      }}
    />
  );
}
