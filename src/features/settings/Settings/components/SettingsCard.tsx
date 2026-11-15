import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface SettingsCardProps {
  title: string;
  subtitle?: string;
  /** Shown at the top right, e.g. a "New …" button. */
  action?: ReactNode;
  children: ReactNode;
}

export function SettingsCard({ title, subtitle, action, children }: SettingsCardProps) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        padding: '20px 22px',
        marginBottom: 2.25,
        boxShadow: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Typography
          sx={{ flex: 1, fontSize: 15, fontWeight: 500, marginBottom: subtitle ? 0.5 : 1.75 }}
        >
          {title}
        </Typography>
        {action}
      </Box>
      {subtitle && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', marginBottom: 2 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  );
}
