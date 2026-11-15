import type { SxProps, Theme } from '@mui/material';
import { Icon } from './Icon';
import { DEFAULT_STATUS_COLOR, DEFAULT_STATUS_ICON, type WorkflowStatus } from '@/data/workflows';

interface StatusIconProps {
  /** From the project's workflow; undefined draws the neutral "to do" circle. */
  status: Pick<WorkflowStatus, 'icon' | 'color'> | undefined;
  size?: number;
  sx?: SxProps<Theme>;
}

export function StatusIcon({ status, size = 18, sx }: StatusIconProps) {
  return (
    <Icon
      name={status?.icon || DEFAULT_STATUS_ICON}
      size={size}
      sx={{ color: status?.color || DEFAULT_STATUS_COLOR, flexShrink: 0, ...sx }}
    />
  );
}
