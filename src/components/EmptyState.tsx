import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <Box sx={{ padding: '60px 24px', textAlign: 'center', color: 'text.secondary' }}>
      <Icon
        name={icon}
        size={48}
        sx={{ color: 'text.disabled', display: 'block', margin: '0 auto 10px' }}
      />
      <Typography sx={{ fontSize: 15, fontWeight: 500, color: 'text.primary', marginBottom: 0.5 }}>
        {title}
      </Typography>
      {subtitle && <Typography sx={{ fontSize: 13, marginBottom: 1.75 }}>{subtitle}</Typography>}
      {action && <Box sx={{ marginTop: 1.5 }}>{action}</Box>}
    </Box>
  );
}
