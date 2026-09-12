import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface SettingsCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SettingsCard({ title, subtitle, children }: SettingsCardProps) {
  return (
    <Box
      sx={{
        background: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        padding: '20px 22px',
        marginBottom: 2.25,
        boxShadow: 1,
      }}
    >
      <Typography sx={{ fontSize: 15, fontWeight: 500, marginBottom: subtitle ? 0.5 : 1.75 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', marginBottom: 2 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  );
}
