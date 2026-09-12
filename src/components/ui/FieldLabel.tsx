import { Typography } from '@mui/material';
import type { ReactNode } from 'react';

/** Small label above a custom form control (pickers, chip rows). */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12, color: 'text.secondary', marginBottom: 0.75, fontWeight: 500 }}>
      {children}
    </Typography>
  );
}
