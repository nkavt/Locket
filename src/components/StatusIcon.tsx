import type { SxProps, Theme } from '@mui/material';
import { Icon } from './Icon';
import { STATUSES } from '@/data/constants';
import type { StatusValue } from '@/data/types';

interface StatusIconProps {
  status: StatusValue;
  size?: number;
  sx?: SxProps<Theme>;
}

export function StatusIcon({ status, size = 18, sx }: StatusIconProps) {
  const opt = STATUSES.find((s) => s.value === status);
  return (
    <Icon
      name={opt?.icon || 'radio_button_unchecked'}
      size={size}
      sx={{ color: opt?.color || 'text.disabled', flexShrink: 0, ...sx }}
    />
  );
}
