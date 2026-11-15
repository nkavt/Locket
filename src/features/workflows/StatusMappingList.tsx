import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { StatusIcon } from '@/components/StatusIcon';
import { SelectInput, type SelectOption } from '@/components/ui';
import type { WorkflowStatus } from '@/data/types';

export interface StatusMappingRow {
  key: string;
  status: Pick<WorkflowStatus, 'name' | 'icon' | 'color'>;
  /** Tickets that will move. */
  count: number;
}

interface StatusMappingListProps {
  rows: StatusMappingRow[];
  targets: ReadonlyArray<SelectOption>;
  /** Row key → chosen target value. */
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/**
 * "These tickets go there": one line per source status with its ticket count and a target
 * picker. Used when a project switches workflow and when a status with tickets is deleted.
 */
export function StatusMappingList({ rows, targets, value, onChange }: StatusMappingListProps) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {rows.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <StatusIcon status={row.status} />
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 14 }}>
                {row.status.name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {t('projects.switchWorkflow.tickets', { count: row.count })}
              </Typography>
            </Box>
          </Box>
          <Icon name="chevron_right" size={18} sx={{ color: 'text.disabled' }} />
          <SelectInput
            fullWidth
            value={value[row.key] ?? ''}
            onChange={(e) => onChange({ ...value, [row.key]: e.target.value })}
            options={targets}
            inputProps={{ 'aria-label': row.status.name }}
          />
        </Box>
      ))}
    </Box>
  );
}
