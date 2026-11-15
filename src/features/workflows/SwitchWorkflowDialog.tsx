import { Button, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogBase } from '@/components/ui';
import type { Workflow } from '@/data/types';
import { mapByCategory } from '@/data/workflows';
import { StatusMappingList } from './StatusMappingList';

interface SwitchWorkflowDialogProps {
  open: boolean;
  from: Workflow;
  to: Workflow;
  /** Tickets of the project per current status id. */
  ticketCounts: Record<string, number>;
  onClose: () => void;
  /** Old status id → new status id, for every status that has tickets. */
  onConfirm: (statusMap: Record<string, string>) => void;
}

/**
 * Review step before a project changes workflow: where each status's tickets end up.
 * Mount it only while reviewing; the suggested mapping is worked out when it mounts.
 */
export function SwitchWorkflowDialog({
  open,
  from,
  to,
  ticketCounts,
  onClose,
  onConfirm,
}: SwitchWorkflowDialogProps) {
  const { t } = useTranslation();
  const used = useMemo(() => from.statuses.filter((s) => ticketCounts[s.id]), [from, ticketCounts]);
  const [map, setMap] = useState(() => mapByCategory(from, to));

  return (
    <DialogBase
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      title={t('projects.switchWorkflow.title', { workflow: to.name })}
      actions={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => onConfirm(Object.fromEntries(used.map((s) => [s.id, map[s.id]])))}
          >
            {t('projects.switchWorkflow.confirm')}
          </Button>
        </>
      }
    >
      <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>
        {t('projects.switchWorkflow.message')}
      </Typography>
      <StatusMappingList
        rows={used.map((s) => ({ key: s.id, status: s, count: ticketCounts[s.id] }))}
        targets={to.statuses.map((s) => ({ value: s.id, label: s.name, icon: s.icon }))}
        value={map}
        onChange={setMap}
      />
    </DialogBase>
  );
}
